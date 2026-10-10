import "server-only";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";

// Local disk storage under /public/uploads. Swap for S3/Cloudinary when hosting on a read-only filesystem.
const DIR = path.join(process.cwd(), "public", "uploads");
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"]);
const MAX_BYTES = 12 * 1024 * 1024;

export async function saveUpload(file: File): Promise<string | null> {
  if (!ALLOWED.has(file.type) || file.size === 0 || file.size > MAX_BYTES) return null;
  await mkdir(DIR, { recursive: true });
  const ext = file.type.split("/")[1].replace("jpeg", "jpg");
  const name = `${Date.now()}-${randomBytes(6).toString("hex")}.${ext}`;
  await writeFile(path.join(DIR, name), Buffer.from(await file.arrayBuffer()));
  return `/uploads/${name}`;
}

export async function deleteUpload(url: string) {
  if (!url.startsWith("/uploads/")) return;
  await unlink(path.join(DIR, path.basename(url))).catch(() => {});
}
