import fs from "fs/promises";
import path from "path";

/**
 * DeepSeek 读不到 localhost /uploads 相对路径。
 * 统一转成 data URL（或可公网访问的 https）再交给视觉模型。
 */
export async function resolveImagesForVision(
  urls: string[],
  limit = 4,
): Promise<string[]> {
  const out: string[] = [];
  for (const raw of urls.filter(Boolean).slice(0, limit)) {
    try {
      const resolved = await resolveOne(raw);
      if (resolved) out.push(resolved);
    } catch {
      // skip broken image
    }
  }
  return out;
}

async function resolveOne(url: string): Promise<string | null> {
  if (url.startsWith("data:")) return url;

  if (url.startsWith("/uploads/")) {
    const filePath = path.join(process.cwd(), "public", url.replace(/^\//, ""));
    const buf = await fs.readFile(filePath);
    return toDataUrl(buf, guessMime(url));
  }

  if (url.startsWith("http://") || url.startsWith("https://")) {
    const isLocal =
      /localhost|127\.0\.0\.1/i.test(url) ||
      url.includes("0.0.0.0");
    if (!isLocal && url.startsWith("https://")) {
      // 公网图仍转 data，避免模型拉不到部分 CDN
      try {
        return await fetchAsDataUrl(url);
      } catch {
        return url;
      }
    }
    return await fetchAsDataUrl(url);
  }

  return null;
}

async function fetchAsDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch image ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
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
