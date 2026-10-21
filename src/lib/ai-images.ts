import fs from "fs/promises";
import path from "path";

const MAX_DATA_BYTES = 700_000; // ~0.7MB，避免塞爆模型上下文

/**
 * 视觉模型用图：公网 https 直接传 URL；本地 /uploads 转 data URL。
 * 不再把大图整张 base64 塞进请求（易导致 DeepSeek 空响应 / 500）。
 */
export async function resolveImagesForVision(
  urls: string[],
  limit = 2,
): Promise<string[]> {
  const out: string[] = [];
  for (const raw of urls.filter(Boolean).slice(0, limit)) {
    try {
      const resolved = await resolveOne(raw);
      if (resolved) out.push(resolved);
    } catch {
      // skip
    }
  }
  return out;
}

async function resolveOne(url: string): Promise<string | null> {
  if (url.startsWith("data:")) {
    return url.length < MAX_DATA_BYTES * 1.4 ? url : null;
  }

  if (url.startsWith("/uploads/")) {
    const filePath = path.join(process.cwd(), "public", url.replace(/^\//, ""));
    const buf = await fs.readFile(filePath);
    if (buf.length > MAX_DATA_BYTES) return null;
    return toDataUrl(buf, guessMime(url));
  }

  if (url.startsWith("https://")) {
    // 公网图（如 Supabase）直接给模型拉，勿转巨大 base64
    return url;
  }

  if (url.startsWith("http://")) {
    const isLocal = /localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(url);
    if (isLocal) {
      return await fetchAsDataUrl(url);
    }
    return url;
  }

  return null;
}

async function fetchAsDataUrl(url: string): Promise<string | null> {
  const res = await fetch(url);
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > MAX_DATA_BYTES) return null;
  const mime = res.headers.get("content-type") || guessMime(url);
  return toDataUrl(buf, mime.split(";")[0] || "image/jpeg");
}

function toDataUrl(buf: Buffer, mime: string) {
  return `data:${mime};base64,${buf.toString("base64")}`;
}

function guessMime(url: string) {
  const lower = url.toLowerCase();
  if (lower.includes(".png")) return "image/png";
  if (lower.includes(".webp")) return "image/webp";
  if (lower.includes(".gif")) return "image/gif";
  return "image/jpeg";
}
