"use client";

import { useState } from "react";

export function ImageUpload({
  value,
  onChange,
}: {
  value?: string | null;
  onChange: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(file: File | null) {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const url = await uploadOne(file);
      onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "上传失败");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <input
        type="file"
        accept="image/*"
        className="block w-full text-sm text-ink-soft"
        disabled={uploading}
        onChange={(e) => handleFile(e.target.files?.[0] || null)}
      />
      {uploading ? <p className="text-xs text-ink-mute">上传中…</p> : null}
      {error ? <p className="text-xs text-red-700/80">{error}</p> : null}
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="预览" className="h-28 w-28 rounded-2xl object-cover" />
      ) : null}
    </div>
  );
}

export function MultiImageUpload({
  urls,
  onChange,
}: {
  urls: string[];
  onChange: (urls: string[]) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    setUploading(true);
    setError("");
    try {
      const next = [...urls];
      for (const file of Array.from(fileList)) {
        next.push(await uploadOne(file));
      }
      onChange(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "上传失败");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <input
        type="file"
        accept="image/*"
        multiple
        className="block w-full text-sm text-ink-soft"
        disabled={uploading}
        onChange={(e) => handleFiles(e.target.files)}
      />
      {uploading ? <p className="text-xs text-ink-mute">上传中…</p> : null}
      {error ? <p className="text-xs text-red-700/80">{error}</p> : null}
      {urls.length ? (
        <div className="flex flex-wrap gap-2">
          {urls.map((url, index) => (
            <div key={`${url}-${index}`} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`图${index + 1}`}
                className="h-20 w-20 rounded-xl object-cover"
              />
              <button
                type="button"
                className="absolute -right-1 -top-1 h-5 w-5 rounded-full bg-ink text-[10px] text-white"
                onClick={() => onChange(urls.filter((_, i) => i !== index))}
              >
                ×
              </button>
              {index === 0 ? (
                <span className="absolute bottom-1 left-1 bg-black/60 px-1 text-[10px] text-white">
                  封面
                </span>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
      <p className="text-xs text-ink-mute">第一张为封面，可多选</p>
    </div>
  );
}

async function uploadOne(file: File) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: form });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "上传失败");
  return data.url as string;
}
