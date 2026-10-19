import { put } from "@vercel/blob";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import {
  STORAGE_BUCKET,
  getSupabaseAdmin,
  hasSupabaseStorage,
} from "@/lib/supabase-admin";

export async function saveImage(file: File): Promise<string> {
  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = guessExt(file.type, file.name);
  const filename = `${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;
  const contentType = file.type || `image/${ext}`;

  if (hasSupabaseStorage()) {
    return uploadToSupabase(filename, bytes, contentType);
  }

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`cuptale/${filename}`, bytes, {
      access: "public",
      contentType,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return blob.url;
  }

  // Netlify / 无持久磁盘的环境不能靠本地 uploads
  if (process.env.NETLIFY || process.env.VERCEL) {
    throw new Error(
      "线上无法写本地目录。请在 Netlify 配置 NEXT_PUBLIC_SUPABASE_URL 与 SUPABASE_SERVICE_ROLE_KEY，并在 Supabase 建公开桶 cuptale-images",
    );
  }

  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), bytes);
  return `/uploads/${filename}`;
}

async function uploadToSupabase(
  filename: string,
  bytes: Buffer,
  contentType: string,
) {
  const sb = getSupabaseAdmin();
  const objectPath = `drinks/${filename}`;

  let { error } = await sb.storage.from(STORAGE_BUCKET).upload(objectPath, bytes, {
    contentType,
    upsert: false,
  });

  if (error && /bucket|not found|does not exist/i.test(error.message)) {
    await sb.storage.createBucket(STORAGE_BUCKET, {
      public: true,
      fileSizeLimit: "8MB",
    });
    ({ error } = await sb.storage.from(STORAGE_BUCKET).upload(objectPath, bytes, {
      contentType,
      upsert: false,
    }));
  }

  if (error) throw new Error(`上传失败：${error.message}`);

  const { data } = sb.storage.from(STORAGE_BUCKET).getPublicUrl(objectPath);
  return data.publicUrl;
}

function guessExt(mime: string, name: string) {
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("gif")) return "gif";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  const fromName = name.split(".").pop()?.toLowerCase();
  if (fromName && ["png", "jpg", "jpeg", "webp", "gif"].includes(fromName)) {
    return fromName === "jpeg" ? "jpg" : fromName;
  }
  return "jpg";
}
