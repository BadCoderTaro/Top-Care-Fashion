"use client";
import React, { useRef, useState } from "react";

export type ImageListManagerProps = {
  label?: string;
  images: string[];
  onChange: (next: string[]) => void;
  uploadEndpoint?: string; // default: /api/admin/storage/upload?bucket=landing&prefix=assets
};

export default function ImageListManager({ label = "Images", images, onChange, uploadEndpoint = "/api/admin/storage/upload?bucket=landing&prefix=assets" }: ImageListManagerProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const add = (url: string) => {
    if (!url) return;
    onChange([...(images || []), url]);
  };
  const remove = (idx: number) => {
    const next = [...images];
    next.splice(idx, 1);
    onChange(next);
  };
  const move = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= images.length) return;
    const next = [...images];
    [next[idx], next[j]] = [next[j], next[idx]];
    onChange(next);
  };

  const handlePick = () => inputRef.current?.click();
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true); setError(null);
    try {
      const form = new FormData();
      form.append("file", f);
      const res = await fetch(uploadEndpoint, { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Upload failed");
      add(data.url);
    } catch (err: any) {
      setError(err?.message || "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const [urlInput, setUrlInput] = useState("");
  const addUrl = () => {
    const url = urlInput.trim();
    if (!url) return;
    try {
      // basic URL validation
      if (/^\/.+/.test(url) || /^https?:\/\//i.test(url)) {
        add(url);
        setUrlInput("");
      }
    } catch {}
  };

  return (
    <div>
      {label && <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>}
      <div className="flex flex-wrap gap-3 mb-3">
        {(images || []).map((url, i) => (
          <div key={i} className="border rounded p-2 w-40">
            <div className="aspect-square w-full overflow-hidden bg-gray-50 flex items-center justify-center">
              {/^https?:|^\//.test(url) ? (
                <img src={url} alt="img" className="object-cover w-full h-full" />
              ) : (
                <span className="text-xs text-gray-500 break-all">{url}</span>
              )}
            </div>
            <div className="flex justify-between items-center mt-2">
              <button type="button" className="text-xs text-gray-600" onClick={() => move(i, -1)} disabled={i === 0}>↑</button>
              <button type="button" className="text-xs text-gray-600" onClick={() => move(i, 1)} disabled={i === images.length - 1}>↓</button>
              <button type="button" className="text-xs text-red-600" onClick={() => remove(i)}>删除</button>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2 items-center mb-2">
  <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFile} aria-label="选择要上传的图片文件" />
        <button type="button" onClick={handlePick} disabled={busy} className="px-3 py-1.5 border rounded bg-white hover:bg-gray-50 disabled:opacity-50">{busy ? "上传中..." : "上传图片"}</button>
        <input value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder="或粘贴图片 URL (/path 或 https://)" className="flex-1 px-3 py-1.5 border rounded" />
        <button type="button" onClick={addUrl} className="px-3 py-1.5 border rounded bg-white hover:bg-gray-50">添加</button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
