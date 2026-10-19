"use client";

import { useEffect, useRef, useState } from "react";

type CropState = {
  src: string;
  naturalW: number;
  naturalH: number;
};

/** Display image with contain, drag a square that stays inside the photo. */
export function ImageCropUpload({
  urls,
  onChange,
}: {
  urls: string[];
  onChange: (urls: string[]) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [draggingFile, setDraggingFile] = useState(false);
  const [crop, setCrop] = useState<CropState | null>(null);
  const [disp, setDisp] = useState({ w: 0, h: 0, left: 0, top: 0 });
  const [box, setBox] = useState({ x: 0, y: 0, size: 120 });
  const stageRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    mode: "move" | "resize";
    startX: number;
    startY: number;
    ox: number;
    oy: number;
    oSize: number;
  } | null>(null);

  useEffect(() => {
    return () => {
      if (crop?.src.startsWith("blob:")) URL.revokeObjectURL(crop.src);
    };
  }, [crop]);

  useEffect(() => {
    if (!crop || !stageRef.current) return;
    const stage = stageRef.current;
    const stageW = stage.clientWidth;
    const stageH = 320;
    const scale = Math.min(stageW / crop.naturalW, stageH / crop.naturalH);
    const w = crop.naturalW * scale;
    const h = crop.naturalH * scale;
    const left = (stageW - w) / 2;
    const top = (stageH - h) / 2;
    setDisp({ w, h, left, top });
    const size = Math.min(w, h) * 0.72;
    setBox({
      x: left + (w - size) / 2,
      y: top + (h - size) / 2,
      size,
    });
  }, [crop]);

  function clampBox(next: { x: number; y: number; size: number }) {
    const minSize = Math.min(disp.w, disp.h) * 0.35;
    const maxSize = Math.min(disp.w, disp.h);
    let size = Math.min(maxSize, Math.max(minSize, next.size));
    let x = next.x;
    let y = next.y;
    x = Math.min(disp.left + disp.w - size, Math.max(disp.left, x));
    y = Math.min(disp.top + disp.h - size, Math.max(disp.top, y));
    return { x, y, size };
  }

  async function beginCrop(file: File) {
    setError("");
    const src = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setCrop({ src, naturalW: img.naturalWidth, naturalH: img.naturalHeight });
    };
    img.onerror = () => setError("读图失败");
    img.src = src;
  }

  function onBoxPointerDown(e: React.PointerEvent, mode: "move" | "resize") {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    drag.current = {
      mode,
      startX: e.clientX,
      startY: e.clientY,
      ox: box.x,
      oy: box.y,
      oSize: box.size,
    };
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.startX;
    const dy = e.clientY - drag.current.startY;
    if (drag.current.mode === "move") {
      setBox(
        clampBox({
          x: drag.current.ox + dx,
          y: drag.current.oy + dy,
          size: drag.current.oSize,
        }),
      );
    } else {
      setBox(
        clampBox({
          x: drag.current.ox,
          y: drag.current.oy,
          size: drag.current.oSize + Math.max(dx, dy),
        }),
      );
    }
  }

  function onPointerUp() {
    drag.current = null;
  }

  async function confirmCrop() {
    if (!crop || !disp.w) return;
    setUploading(true);
    setError("");
    try {
      const scaleX = crop.naturalW / disp.w;
      const scaleY = crop.naturalH / disp.h;
      const sx = (box.x - disp.left) * scaleX;
      const sy = (box.y - disp.top) * scaleY;
      const sw = box.size * scaleX;
      const sh = box.size * scaleY;

      const canvas = document.createElement("canvas");
      canvas.width = 800;
      canvas.height = 800;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("裁剪失败");

      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("读图失败"));
        img.src = crop.src;
      });

      ctx.fillStyle = "#f5f5f5";
      ctx.fillRect(0, 0, 800, 800);
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, 800, 800);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("导出失败"))),
          "image/jpeg",
          0.92,
        );
      });
      const file = new File([blob], `crop-${Date.now()}.jpg`, {
        type: "image/jpeg",
      });
      const url = await uploadOne(file);
      onChange([...urls, url]);
      if (crop.src.startsWith("blob:")) URL.revokeObjectURL(crop.src);
      setCrop(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "上传失败");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div
        className={`rounded-sm border-2 border-dashed px-4 py-6 text-center text-sm ${
          draggingFile ? "border-ink bg-sand" : "border-[#ddd] bg-white"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDraggingFile(true);
        }}
        onDragLeave={() => setDraggingFile(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDraggingFile(false);
          const file = e.dataTransfer.files?.[0];
          if (file) void beginCrop(file);
        }}
      >
        <p className="text-ink-soft">拖到这里或选择图片</p>
        <input
          type="file"
          accept="image/*"
          className="mt-3 block w-full text-sm text-ink-soft"
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void beginCrop(file);
          }}
        />
      </div>

      {crop ? (
        <div className="space-y-3 border border-[#e8e8e8] p-3">
          <p className="text-sm text-ink-soft">拖动白框取景（不超出照片）</p>
          <div
            ref={stageRef}
            className="relative mx-auto h-[320px] w-full overflow-hidden bg-[#111]"
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={crop.src}
              alt="原图"
              draggable={false}
              className="pointer-events-none absolute select-none"
              style={{
                width: disp.w,
                height: disp.h,
                left: disp.left,
                top: disp.top,
              }}
            />
            <div
              className="absolute cursor-move border-[3px] border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]"
              style={{
                left: box.x,
                top: box.y,
                width: box.size,
                height: box.size,
              }}
              onPointerDown={(e) => onBoxPointerDown(e, "move")}
            >
              <div
                className="absolute bottom-0 right-0 h-5 w-5 cursor-se-resize bg-white"
                onPointerDown={(e) => onBoxPointerDown(e, "resize")}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-ghost flex-1"
              onClick={() => {
                if (crop.src.startsWith("blob:")) URL.revokeObjectURL(crop.src);
                setCrop(null);
              }}
            >
              取消
            </button>
            <button
              type="button"
              className="btn-primary flex-1"
              disabled={uploading}
              onClick={() => void confirmCrop()}
            >
              {uploading ? "上传中…" : "确认上传"}
            </button>
          </div>
        </div>
      ) : null}

      {error ? <p className="text-xs text-red-700/80">{error}</p> : null}

      {urls.length ? (
        <div className="flex flex-wrap gap-2">
          {urls.map((url, index) => (
            <div
              key={`${url}-${index}`}
              className="relative border-[3px] border-ink bg-white p-0.5"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`图${index + 1}`}
                className="h-20 w-20 object-cover"
              />
              <button
                type="button"
                className="absolute -right-2 -top-2 h-5 w-5 rounded-full bg-ink text-[10px] text-white"
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
