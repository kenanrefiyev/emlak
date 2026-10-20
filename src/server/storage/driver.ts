import "server-only";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

export interface StoredObject {
  key: string;
  url: string;
}

/**
 * Storage boundary. `local` writes to UPLOAD_DIR and is served by
 * app/uploads/[...path]/route.ts — fine for development and a single VPS, but
 * NOT durable on serverless hosts. `blob` uses Vercel Blob (BLOB_READ_WRITE_TOKEN).
 */
export interface StorageDriver {
  readonly name: "local" | "blob";
  put(key: string, body: Buffer, contentType: string): Promise<StoredObject>;
  remove(object: StoredObject): Promise<void>;
}

const SAFE_KEY = /^[a-z0-9][a-z0-9/_-]*\.(webp|jpg|png)$/;

export function assertSafeKey(key: string) {
  if (!SAFE_KEY.test(key) || key.includes("..")) throw new Error(`Unsafe storage key: ${key}`);
}

export function uploadRoot() {
  return path.resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.UPLOAD_DIR || "./storage/uploads");
}

const localDriver: StorageDriver = {
  name: "local",
  async put(key, body) {
    assertSafeKey(key);
    const file = path.join(uploadRoot(), key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, body);
    return { key, url: `/uploads/${key}` };
  },
  async remove({ key }) {
    assertSafeKey(key);
    await rm(path.join(uploadRoot(), key), { force: true });
  },
};

const blobDriver: StorageDriver = {
  name: "blob",
  async put(key, body, contentType) {
    assertSafeKey(key);
    const { put } = await import("@vercel/blob");
    const result = await put(key, body, { access: "public", contentType, addRandomSuffix: false });
    return { key, url: result.url };
  },
  async remove({ url }) {
    const { del } = await import("@vercel/blob");
    await del(url);
  },
};

export function storage(): StorageDriver {
  const driver = process.env.STORAGE_DRIVER || (process.env.BLOB_READ_WRITE_TOKEN ? "blob" : "local");
  if (driver === "blob") {
    if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error("STORAGE_DRIVER=blob needs BLOB_READ_WRITE_TOKEN");
    return blobDriver;
  }
  return localDriver;
}

export async function readLocalObject(key: string) {
  assertSafeKey(key);
  return readFile(path.join(uploadRoot(), key));
}
