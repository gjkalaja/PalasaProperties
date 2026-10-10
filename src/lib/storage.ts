import "server-only";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash, randomBytes } from "node:crypto";

// Photos go to Cloudinary when CLOUDINARY_URL is set (needed on Vercel, whose disk is not persistent),
// otherwise to /public/uploads on the local disk.
const DIR = path.join(process.cwd(), "public", "uploads");
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"]);
const MAX_BYTES = 12 * 1024 * 1024;
const FOLDER = "palasa";

function cloudinary() {
  const m = /^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/.exec(process.env.CLOUDINARY_URL ?? "");
  return m ? { key: m[1], secret: m[2], cloud: m[3] } : null;
}

function sign(params: Record<string, string>, secret: string) {
  const base = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHash("sha1").update(base + secret).digest("hex");
}

export async function saveUpload(file: File): Promise<string | null> {
  if (!ALLOWED.has(file.type) || file.size === 0 || file.size > MAX_BYTES) return null;
  const c = cloudinary();
  if (c) {
    const params = { folder: FOLDER, timestamp: String(Math.floor(Date.now() / 1000)) };
    const body = new FormData();
    body.set("file", file);
    body.set("api_key", c.key);
    body.set("signature", sign(params, c.secret));
    for (const [k, v] of Object.entries(params)) body.set(k, v);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${c.cloud}/image/upload`, { method: "POST", body });
    if (!res.ok) throw new Error(`Cloudinary upload failed: ${res.status} ${await res.text()}`);
    const json = (await res.json()) as { secure_url: string };
    // Serve a resized, auto-format version
    return json.secure_url.replace("/image/upload/", "/image/upload/f_auto,q_auto,w_1800/");
  }
  if (process.env.VERCEL) throw new Error("CLOUDINARY_URL is required to upload photos on Vercel");
  await mkdir(DIR, { recursive: true });
  const ext = file.type.split("/")[1].replace("jpeg", "jpg");
  const name = `${Date.now()}-${randomBytes(6).toString("hex")}.${ext}`;
  await writeFile(path.join(DIR, name), Buffer.from(await file.arrayBuffer()));
  return `/uploads/${name}`;
}

export async function deleteUpload(url: string) {
  const c = cloudinary();
  const m = /\/image\/upload\/(?:[^/]+\/)?v\d+\/(.+)\.\w+$/.exec(url);
  if (c && url.includes("res.cloudinary.com") && m) {
    const params = { public_id: m[1], timestamp: String(Math.floor(Date.now() / 1000)) };
    const body = new URLSearchParams({ ...params, api_key: c.key, signature: sign(params, c.secret) });
    await fetch(`https://api.cloudinary.com/v1_1/${c.cloud}/image/destroy`, { method: "POST", body }).catch(() => {});
    return;
  }
  if (!url.startsWith("/uploads/")) return;
  await unlink(path.join(DIR, path.basename(url))).catch(() => {});
}
