"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SearchBar from "@/components/admin/SearchBar";

interface FileInfo {
  name: string;
  path: string;
  size: number;
  lastModified: string | null;
  url: string;
  isOrphan?: boolean;
}

interface Stats {
  totalFiles: number;
  totalSize: number;
  totalSizeMB: string;
  orphanFiles: number;
  orphanSize: number;
  orphanSizeMB: string;
  linkedFiles: number;
}

interface BucketData {
  bucket: string;
  stats: Stats;
  files: FileInfo[];
  orphanFiles: FileInfo[];
}

export default function ListingImagesPage() {
  const [data, setData] = useState<BucketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showOrphansOnly, setShowOrphansOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/listing-images", { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`Failed to fetch: ${res.status} ${res.statusText}`);
      }
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setError(e.message || "Load failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleDeleteSelected = async () => {
    if (selectedFiles.size === 0) {
      alert("Please select at least one file to delete");
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedFiles.size} selected file(s)? This action cannot be undone.`)) {
      return;
    }

    setDeleting(true);
    try {
      const filePaths = Array.from(selectedFiles);
      const res = await fetch("/api/admin/listing-images", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePaths }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Delete failed");
      }

      const result = await res.json();
      alert(`Successfully deleted ${result.deletedCount} file(s)`);

      // Clear selection and reload
      setSelectedFiles(new Set());
      await load();
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const toggleFileSelection = (filePath: string) => {
    setSelectedFiles((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(filePath)) {
        newSet.delete(filePath);
      } else {
        newSet.add(filePath);
      }
      return newSet;
    });
  };

  const selectAllOrphans = () => {
    if (!data) return;
    const orphanPaths = data.orphanFiles.map((f) => f.path);
    setSelectedFiles(new Set(orphanPaths));
  };

  const clearSelection = () => {
    setSelectedFiles(new Set());
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleString();
  };

  const filesToDisplay = showOrphansOnly
    ? data?.orphanFiles || []
    : data?.files || [];

  const filteredFiles = filesToDisplay.filter((file) =>
    file.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Listing Images Management</h2>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-800">Error: {error}</div>
          <button
            onClick={load}
            className="mt-2 px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Listing Images Management</h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage listing-images bucket and clean up orphan files
          </p>
        </div>
        <Link
          href="/admin"
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm font-medium"
        >
          Back to Admin
        </Link>
      </div>

      {/* Stats Cards */}
      {!loading && data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border rounded-lg p-6">
            <div className="text-sm text-gray-600">Total Files</div>
            <div className="text-3xl font-bold mt-2">{data.stats.totalFiles}</div>
            <div className="text-xs text-gray-500 mt-1">{data.stats.totalSizeMB} MB</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="text-sm text-green-600 font-medium">Linked Files</div>
            <div className="text-3xl font-bold text-green-600 mt-2">{data.stats.linkedFiles}</div>
            <div className="text-xs text-green-600 mt-1">In use by listings</div>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
            <div className="text-sm text-orange-600 font-medium">Orphan Files</div>
            <div className="text-3xl font-bold text-orange-600 mt-2">{data.stats.orphanFiles}</div>
            <div className="text-xs text-orange-600 mt-1">{data.stats.orphanSizeMB} MB wasted</div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="text-sm text-blue-600 font-medium">Bucket Size</div>
            <div className="text-3xl font-bold text-blue-600 mt-2">{data.stats.totalSizeMB}</div>
            <div className="text-xs text-blue-600 mt-1">MB total storage</div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="bg-white border rounded-lg p-6">
        <div className="flex flex-col gap-4">
          <div>
            <h3 className="text-lg font-semibold">Bulk Actions</h3>
            <p className="text-sm text-gray-600 mt-1">
              Manually select files to delete
            </p>
            <div className="text-xs text-gray-500 mt-2">
              Detection method: Checks listings.image_url, listings.image_urls[], and reviews.images[]
            </div>
          </div>

          {selectedFiles.size > 0 && (
            <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-md p-4">
              <div>
                <div className="font-medium text-blue-900">
                  {selectedFiles.size} file(s) selected
                </div>
                <div className="text-sm text-blue-600 mt-1">
                  Ready to delete manually
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={clearSelection}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 font-medium"
                >
                  Clear Selection
                </button>
                <button
                  type="button"
                  onClick={handleDeleteSelected}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 font-medium"
                >
                  {deleting ? "Deleting..." : "Delete Selected"}
                </button>
              </div>
            </div>
          )}

          {data && data.stats.orphanFiles > 0 && selectedFiles.size === 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-md p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-orange-800">
                  {data.stats.orphanFiles} orphan file(s) found
                </div>
                <button
                  type="button"
                  onClick={selectAllOrphans}
                  className="text-sm text-orange-600 hover:text-orange-800 font-medium underline"
                >
                  Select All Orphans
                </button>
              </div>
            </div>
          )}

          {data && data.stats.orphanFiles === 0 && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4 text-green-800 text-sm">
              No orphan files found. All images are properly linked to listings.
            </div>
          )}
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white border rounded-lg p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search files by name..."
            className="flex-1"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setShowOrphansOnly(false)}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                !showOrphansOnly
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              All Files ({data?.stats.totalFiles || 0})
            </button>
            <button
              onClick={() => setShowOrphansOnly(true)}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                showOrphansOnly
                  ? "bg-orange-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Orphans Only ({data?.stats.orphanFiles || 0})
            </button>
          </div>
        </div>
      </div>

      {/* Files List */}
      {loading ? (
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-white rounded-lg border">
          {searchTerm ? "No files match your search." : "No files found."}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-sm text-gray-600">
            Showing {filteredFiles.length} of {filesToDisplay.length} files
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredFiles.map((file) => (
              <div
                key={file.path}
                className={`bg-white border rounded-lg p-4 hover:shadow-md transition-all relative ${
                  file.isOrphan ? "border-orange-300 bg-orange-50/30" : ""
                } ${selectedFiles.has(file.path) ? "ring-2 ring-blue-500" : ""}`}
              >
                {/* Checkbox */}
                <div className="absolute top-2 left-2 z-10">
                  <input
                    type="checkbox"
                    checked={selectedFiles.has(file.path)}
                    onChange={() => toggleFileSelection(file.path)}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    aria-label={`Select ${file.name}`}
                    title={`Select ${file.name}`}
                  />
                </div>

                <div className="aspect-square bg-gray-100 rounded-md mb-3 overflow-hidden">
                  <img
                    src={file.url}
                    alt={file.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const img = e.target as HTMLImageElement;
                      img.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%23ddd'/%3E%3Ctext x='50' y='50' text-anchor='middle' dy='.3em' fill='%23999'%3ENo Image%3C/text%3E%3C/svg%3E";
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="text-xs font-mono text-gray-800 truncate flex-1" title={file.name}>
                      {file.name}
                    </div>
                    {file.isOrphan && (
                      <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-800 rounded font-medium">
                        Orphan
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">{formatBytes(file.size)}</div>
                  <div className="text-xs text-gray-400">{formatDate(file.lastModified)}</div>
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline block mt-2"
                  >
                    View Full Size
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
