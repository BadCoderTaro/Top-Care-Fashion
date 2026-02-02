"use client";
import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";

type AssetItem = {
  name: string;
  path: string;
  url: string;
  size: number | null;
  lastModified: string | null;
};

export default function AssetLibraryManager({
  title = "Asset Library",
  bucket = "assets",
  prefix = "assets/",
  onApply,
  initialSelectedUrls,
  className = "",
  displayMode = "grid",
}: {
  title?: string;
  bucket?: string;
  prefix?: string;
  onApply?: (urls: string[]) => void;
  initialSelectedUrls?: string[];
  className?: string;
  displayMode?: "grid" | "list";
}) {
  const [items, setItems] = useState<AssetItem[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [folders, setFolders] = useState<string[]>([]);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  // Track whether user has interacted to avoid sending empty selection on initial mount
  const userTouchedRef = useRef(false);
  const dragThrottleRef = useRef<NodeJS.Timeout | null>(null);
  // Use state for temporary display order during drag (only updates visual, not actual selected)
  const [tempDisplayOrder, setTempDisplayOrder] = useState<string[] | null>(null);
  // Use refs to access latest values in callbacks
  const selectedRef = useRef(selected);
  const tempDisplayOrderRef = useRef(tempDisplayOrder);
  
  // Keep refs in sync
  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);
  
  useEffect(() => {
    tempDisplayOrderRef.current = tempDisplayOrder;
  }, [tempDisplayOrder]);

  // Fetch items from API
  async function fetchItems() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/storage/list?bucket=${encodeURIComponent(bucket)}&prefix=${encodeURIComponent(prefix)}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setItems(data.files || []);
      setFolders((data.folders || []).filter((f: string) => f.startsWith(prefix)));
    } catch (e) {
      console.error(e);
      alert("Failed to load assets");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bucket, prefix]);

  // Cleanup throttle on unmount
  useEffect(() => {
    return () => {
      if (dragThrottleRef.current) {
        clearTimeout(dragThrottleRef.current);
      }
    };
  }, []);

  // Toggle selection
  function toggleSelect(path: string) {
    userTouchedRef.current = true;
    setSelected((prev) => (prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]));
  }

  // Select all in folder
  function selectFolder(folderPath: string) {
    const inFolder = items.filter((i) => i.path.startsWith(folderPath)).map((i) => i.path);
    userTouchedRef.current = true;
    setSelected(inFolder);
  }

  // Upload files
  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append("file", file);
        const qs = new URLSearchParams({ bucket, prefix });
        const res = await fetch(`/api/admin/storage/upload?${qs.toString()}`, { method: "POST", body: form });
        if (!res.ok) {
          throw new Error(await res.text());
        }
      }
      await fetchItems();
      alert(`Uploaded ${files.length} file(s)`);
    } catch (e) {
      console.error(e);
      alert("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  // Delete files
  async function handleDelete(paths: string[]) {
    if (!paths.length) return;
    if (!confirm(`Delete ${paths.length} file(s)?`)) return;
    try {
      for (const p of paths) {
        const res = await fetch("/api/admin/storage/delete", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bucket, path: p }),
        });
        if (!res.ok) {
          throw new Error(await res.text());
        }
      }
      await fetchItems();
      setSelected((prev) => prev.filter((p) => !paths.includes(p)));
    } catch (e) {
      console.error(e);
      alert("Delete failed");
    }
  }

  // Apply selection removed — onApply is called automatically on selection changes

  // Drag and drop reorder
  const handleDragStart = useCallback((path: string) => {
    setDraggedItem(path);
    setDragOverIndex(null);
    // Store current order for drag operations
    setTempDisplayOrder([...selected]);
  }, [selected]);

  const handleDragOver = useCallback((e: React.DragEvent, targetPath: string) => {
    e.preventDefault();
    if (!draggedItem || draggedItem === targetPath) return;

    // Use tempDisplayOrder if available, otherwise use selected
    const currentOrder = tempDisplayOrder || selected;
    const dragIdx = currentOrder.indexOf(draggedItem);
    const targetIdx = currentOrder.indexOf(targetPath);
    
    if (dragIdx === -1 || targetIdx === -1 || dragIdx === targetIdx) return;

    // Update visual indicator (lightweight state update)
    setDragOverIndex(targetIdx);

    // Throttle the order update to reduce flickering
    if (dragThrottleRef.current) {
      return;
    }

    // Update temp display order (for visual feedback only) with throttling
    dragThrottleRef.current = setTimeout(() => {
      // Use refs to get latest values
      const latestOrder = tempDisplayOrderRef.current || selectedRef.current;
      const latestDragIdx = latestOrder.indexOf(draggedItem);
      const latestTargetIdx = latestOrder.indexOf(targetPath);
      
      if (latestDragIdx !== -1 && latestTargetIdx !== -1 && latestDragIdx !== latestTargetIdx) {
        const newOrder = [...latestOrder];
        newOrder.splice(latestDragIdx, 1);
        newOrder.splice(latestTargetIdx, 0, draggedItem);
        setTempDisplayOrder(newOrder);
      }
      
      dragThrottleRef.current = null;
    }, 100); // Throttle to 100ms for smoother updates
  }, [draggedItem, selected, tempDisplayOrder]);

  const handleDragEnd = useCallback(() => {
    if (dragThrottleRef.current) {
      clearTimeout(dragThrottleRef.current);
      dragThrottleRef.current = null;
    }
    
    // Finalize the order from temp display order
    if (tempDisplayOrder) {
      userTouchedRef.current = true;
      setSelected([...tempDisplayOrder]);
    }
    
    setTempDisplayOrder(null);
    setDraggedItem(null);
    setDragOverIndex(null);
  }, [tempDisplayOrder]);

  // Move selected item
  function moveItem(path: string, direction: -1 | 1) {
    const idx = selected.indexOf(path);
    if (idx === -1) return;
    
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= selected.length) return;

    const newSelected = [...selected];
    [newSelected[idx], newSelected[newIdx]] = [newSelected[newIdx], newSelected[idx]];
    userTouchedRef.current = true;
    setSelected(newSelected);
  }

  // initialize selected from initialSelectedUrls once items are loaded
  useEffect(() => {
    // Additional debug: always log items and initialSelectedUrls when either changes
    try {
       
      console.log(`DBG AssetLibraryManager[${title}](${prefix}): items.count=`, items.length);
       
      console.log(`DBG AssetLibraryManager[${title}](${prefix}): initialSelectedUrls=`, initialSelectedUrls);
    } catch {}

    if (!initialSelectedUrls || initialSelectedUrls.length === 0 || items.length === 0) return;
    // Debug: show incoming values to help diagnose matching failures
    // (temporary logs - remove when issue is resolved)
    try {
       
      console.log(`AssetLibraryManager[${title}](${prefix}): initialSelectedUrls:`, initialSelectedUrls);
       
      console.log(`AssetLibraryManager[${title}](${prefix}): item urls:`, items.map(i => i.url));
    } catch {}

    // Try several matching strategies to account for DB storing relative paths or encoded values
    const paths: string[] = [];
    for (const u of initialSelectedUrls) {
      if (!u) continue;
      const found = items.find((i) => {
        try {
          const decodedItem = decodeURIComponent(i.url);
          const decodedU = decodeURIComponent(u);
          const itemBase = i.url.split("/").pop();
          const uBase = u.split("/").pop();
          const decodedItemBase = decodedItem.split("/").pop();
          const decodedUBase = decodedU.split("/").pop();
          return (
            i.url === u ||
            decodedItem === u ||
            i.url === decodedU ||
            decodedItem === decodedU ||
            i.url.endsWith(u) ||
            decodedItem.endsWith(u) ||
            i.url.includes(u) ||
            decodedItem.includes(u) ||
            // basename-only fallback (last segment)
            itemBase === uBase ||
            decodedItemBase === uBase ||
            itemBase === decodedUBase ||
            decodedItemBase === decodedUBase ||
            // some stored values might omit leading slash
            i.url.endsWith('/' + u) ||
            decodedItem.endsWith('/' + u)
          );
        } catch {
          // decodeURIComponent may throw for invalid input; fall back to simple checks
          try {
            const itemBase = i.url.split("/").pop();
            const uBase = u.split("/").pop();
            return (
              i.url === u ||
              i.url.endsWith(u) ||
              i.url.includes(u) ||
              i.url.endsWith('/' + u) ||
              itemBase === uBase
            );
          } catch {
            return i.url === u || i.url.endsWith(u) || i.url.includes(u) || i.url.endsWith('/' + u);
          }
        }
      });
      if (found) paths.push(found.path);
    }
    // Debug: report matched and unmatched
      try {
      const matchedUrls = paths.map(p => items.find(i => i.path === p)?.url).filter(Boolean);
      const unmatched = initialSelectedUrls.filter(u => !matchedUrls.includes(u));
       
      console.log(`AssetLibraryManager[${title}](${prefix}): matchedUrls:`, matchedUrls);
       
      console.log(`AssetLibraryManager[${title}](${prefix}): unmatched initial urls:`, unmatched);
    } catch {}

    // only set if differs
    const same = paths.length === selected.length && paths.every((p, idx) => selected[idx] === p);
    if (!same && paths.length > 0) {
   
  console.log(`AssetLibraryManager[${title}](${prefix}): setting selected paths:`, paths);
      setSelected(paths);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, initialSelectedUrls]);

  // notify parent when selected changes (runs after render)
  useEffect(() => {
    if (!onApply) return;
    // Only notify parent after user interaction to avoid clobbering pre-fetched values with empty [] on mount
    if (!userTouchedRef.current) return;
    const orderedUrls = selected.map(p => items.find(i => i.path === p)).filter(Boolean).map(i => i!.url);
    // call asynchronously to avoid setState during render of parent
    const t = setTimeout(() => onApply(orderedUrls), 0);
    return () => clearTimeout(t);
  // intentionally depend on selected and items
  }, [selected, items, onApply]);

  // Preview navigation
  function openPreview(index: number) {
    setPreviewIndex(index);
  }

  function closePreview() {
    setPreviewIndex(null);
  }

  function prevPreview() {
    if (previewIndex === null || previewIndex <= 0) return;
    setPreviewIndex(previewIndex - 1);
  }

  function nextPreview() {
    if (previewIndex === null || previewIndex >= items.length - 1) return;
    setPreviewIndex(previewIndex + 1);
  }

  // Use temp order during drag, otherwise use selected
  const displayOrder = useMemo(() => {
    return tempDisplayOrder || selected;
  }, [selected, tempDisplayOrder]);

  const selectedItems = useMemo(() => {
    return displayOrder
      .map(path => items.find(i => i.path === path))
      .filter(Boolean) as AssetItem[];
  }, [displayOrder, items]);

  const allPaths = items.map((i) => i.path);
  const isAllSelected = selected.length > 0 && selected.length === allPaths.length;

  const isGridMode = displayMode === "grid";

  return (
    <section className={`w-full bg-white rounded-lg shadow-sm border p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
        <div className="text-sm text-gray-500">
          {items.length} items • {selected.length} selected
        </div>
      </div>

      {/* Folder Quick Select */}
      {folders.length > 0 && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-xs font-semibold text-gray-600 mb-2">QUICK SELECT FOLDER:</div>
          <div className="flex flex-wrap gap-2">
            {folders.map((f) => (
              <button
                key={f}
                onClick={() => selectFolder(f)}
                className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-blue-50 hover:border-blue-400 transition-colors"
              >
                📁 {f.replace(prefix, "").replace(/\/$/, "") || "/"}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {uploading ? "Uploading..." : "📤 Upload"}
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => handleUpload(e.target.files)}
          aria-label="Upload images"
        />
        
        <button
          onClick={() => fetchItems()}
          disabled={loading}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors font-medium"
        >
          🔄 Refresh
        </button>

        <button
          onClick={() => { userTouchedRef.current = true; setSelected(isAllSelected ? [] : allPaths); }}
          disabled={items.length === 0}
          className="px-4 py-2 bg-gray-100 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors font-medium"
        >
          {isAllSelected ? "Unselect All" : "Select All"}
        </button>

        <button
          onClick={() => handleDelete(selected)}
          disabled={selected.length === 0}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          🗑️ Delete Selected
        </button>

        <button
          onClick={() => { userTouchedRef.current = true; setSelected([]); }}
          disabled={selected.length === 0}
          className="px-4 py-2 bg-gray-100 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors font-medium"
        >
          Clear
        </button>

        {/* Apply button removed: selections are auto-applied to parent state. Use page's Update Content to persist. */}
      </div>

      {/* Selected Items Preview */}
      {selectedItems.length > 0 && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-sm font-semibold text-blue-900 mb-3">
            SELECTED ({selectedItems.length}) - Drag to reorder
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedItems.map((item, idx) => {
              const isDragging = draggedItem === item.path;
              const isDragOver = dragOverIndex === idx && draggedItem && draggedItem !== item.path;
              
              return (
              <div
                key={item.path}
                draggable
                onDragStart={() => handleDragStart(item.path)}
                onDragOver={(e) => handleDragOver(e, item.path)}
                onDragEnd={handleDragEnd}
                className={`group relative flex items-center gap-2 px-3 py-2 bg-white border-2 rounded-lg cursor-move hover:shadow-lg ${
                  isDragging ? "opacity-50 z-50" : isDragOver ? "opacity-90 border-blue-600" : "opacity-100"
                } border-blue-400`}
                style={{
                  transform: isDragging ? 'scale(0.95)' : 'scale(1)',
                  transition: isDragging ? 'none' : 'opacity 0.15s ease-out, transform 0.15s ease-out, border-color 0.15s ease-out'
                }}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-xs font-bold text-blue-600">#{idx + 1}</span>
                  <span className="text-sm truncate max-w-[150px]">{item.name}</span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => moveItem(item.path, -1)}
                    disabled={idx === 0}
                    className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveItem(item.path, 1)}
                    disabled={idx === selectedItems.length - 1}
                    className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Move down"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => toggleSelect(item.path)}
                    className="px-2 py-1 text-xs bg-red-100 text-red-600 rounded hover:bg-red-200"
                    title="Remove from selection"
                  >
                    ✕
                  </button>
                </div>
              </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Asset Listing */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
          <div className="mt-4 text-gray-500 font-medium">Loading assets...</div>
        </div>
      ) : items.length === 0 ? (
        <div className="py-20 text-center text-gray-400">
          <div className="text-6xl mb-4">📁</div>
          <div className="text-lg font-medium">No assets found</div>
          <div className="text-sm mt-2">Upload some images to get started</div>
        </div>
      ) : isGridMode ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {items.map((item, idx) => {
            const isSelected = selected.includes(item.path);
            const selectionOrder = isSelected ? selected.indexOf(item.path) + 1 : null;
            
            return (
              <div
                key={item.path}
                className={`group relative border-2 rounded-lg overflow-hidden transition-all hover:shadow-xl ${
                  isSelected ? "border-blue-500 ring-2 ring-blue-200" : "border-gray-200 hover:border-gray-400"
                }`}
              >
                {/* Selection Badge */}
                {isSelected && (
                  <div className="absolute top-2 left-2 z-10 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
                    #{selectionOrder}
                  </div>
                )}

                {/* Image */}
                <div
                  onClick={() => toggleSelect(item.path)}
                  className="relative w-full bg-gray-100 cursor-pointer aspect-square overflow-hidden"
                >
                  <img
                    src={item.url}
                    alt={item.name}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const placeholder = target.parentElement?.querySelector('.image-placeholder');
                      if (placeholder) {
                        (placeholder as HTMLElement).style.display = 'flex';
                      }
                    }}
                  />
                  <div className="image-placeholder absolute inset-0 flex items-center justify-center text-gray-400 text-xs" style={{ display: 'none' }}>
                    Failed to load
                  </div>
                  
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="text-white font-bold text-lg">
                        {isSelected ? "✓ Selected" : "Click to Select"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="p-2 bg-white">
                  <div className="text-xs truncate text-gray-600 mb-2" title={item.name}>
                    {item.name}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => toggleSelect(item.path)}
                      className={`flex-1 px-2 py-1 text-xs rounded font-medium transition-colors ${
                        isSelected
                          ? "bg-blue-600 text-white hover:bg-blue-700"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {isSelected ? "✓" : "Select"}
                    </button>
                    <button
                      onClick={() => openPreview(idx)}
                      className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 font-medium"
                    >
                      👁️
                    </button>
                    <button
                      onClick={() => handleDelete([item.path])}
                      className="px-2 py-1 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100 font-medium"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {items.map((item, idx) => {
            const isSelected = selected.includes(item.path);
            const selectionOrder = isSelected ? selected.indexOf(item.path) + 1 : null;
            return (
              <div
                key={item.path}
                className={`flex items-center justify-between border rounded-md px-3 py-2 text-sm ${
                  isSelected ? "border-blue-400 bg-blue-50" : "border-gray-200 bg-white"
                }`}
              >
                <div className="flex flex-col min-w-0">
                  <span className="font-medium truncate">{item.name}</span>
                  <span className="text-xs text-gray-500 truncate">{item.path.replace(prefix, "")}</span>
                </div>
                <div className="flex items-center gap-2">
                  {selectionOrder && (
                    <span className="text-xs font-semibold text-blue-600">#{selectionOrder}</span>
                  )}
                  <button
                    onClick={() => toggleSelect(item.path)}
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      isSelected ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {isSelected ? "Selected" : "Select"}
                  </button>
                  <button
                    onClick={() => openPreview(idx)}
                    className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-700"
                  >
                    View
                  </button>
                  <button
                    onClick={() => handleDelete([item.path])}
                    className="px-2 py-1 rounded text-xs bg-red-50 text-red-600"
                  >
                    Del
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preview Modal */}
      {previewIndex !== null && items[previewIndex] && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
          onClick={closePreview}
        >
          <div
            className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={closePreview}
              className="absolute top-4 right-4 z-20 bg-white/90 hover:bg-white text-gray-800 rounded-full w-10 h-10 flex items-center justify-center shadow-lg transition-all hover:scale-110"
            >
              ✕
            </button>

            {/* Previous Button */}
            {previewIndex > 0 && (
              <button
                onClick={prevPreview}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-white/90 hover:bg-white text-gray-800 rounded-full w-12 h-12 flex items-center justify-center shadow-lg transition-all hover:scale-110"
              >
                ←
              </button>
            )}

            {/* Next Button */}
            {previewIndex < items.length - 1 && (
              <button
                onClick={nextPreview}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-white/90 hover:bg-white text-gray-800 rounded-full w-12 h-12 flex items-center justify-center shadow-lg transition-all hover:scale-110"
              >
                →
              </button>
            )}

            {/* Image Container */}
            <div className="relative w-full h-[600px] bg-gray-100 flex items-center justify-center">
              <img
                src={items[previewIndex].url}
                alt={items[previewIndex].name}
                className="max-w-full max-h-full object-contain"
                loading="eager"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const placeholder = target.parentElement?.querySelector('.preview-placeholder');
                  if (placeholder) {
                    (placeholder as HTMLElement).style.display = 'flex';
                  }
                }}
              />
              <div className="preview-placeholder absolute inset-0 flex items-center justify-center text-gray-400" style={{ display: 'none' }}>
                <div className="text-center">
                  <div className="text-4xl mb-2">⚠️</div>
                  <div>Failed to load image</div>
                </div>
              </div>
            </div>

            {/* Info Bar */}
            <div className="p-4 bg-gray-50 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-gray-800">{items[previewIndex].name}</div>
                  <div className="text-sm text-gray-500">
                    {previewIndex + 1} / {items.length}
                  </div>
                </div>
                <button
                  onClick={() => toggleSelect(items[previewIndex].path)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selected.includes(items[previewIndex].path)
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  {selected.includes(items[previewIndex].path) ? "✓ Selected" : "Select"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
