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
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "上传失败");
      onChange(data.url);
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
