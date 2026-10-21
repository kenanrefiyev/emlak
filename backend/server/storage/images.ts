import "server-only";
import { randomBytes } from "node:crypto";
import sharp, { type Metadata } from "sharp";
import { ServiceError } from "@/server/errors";

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;
const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp", "avif", "heif"]);
const MAX_EDGE = 1920;

export interface ProcessedImage {
  buffer: Buffer;
  width: number;
  height: number;
  mimeType: "image/webp";
}

/**
 * Validates an upload by declared type, size and actual decoded format (magic
 * bytes via sharp), strips metadata (EXIF/GPS), auto-rotates, caps the long
 * edge and re-encodes to WebP. Anything sharp cannot decode is rejected.
 */
export async function processImage(input: Buffer, declaredType: string): Promise<ProcessedImage> {
  if (!(ALLOWED_MIME as readonly string[]).includes(declaredType)) throw new ServiceError("upload_type");
  if (input.byteLength === 0) throw new ServiceError("upload_empty");
  if (input.byteLength > MAX_UPLOAD_BYTES) throw new ServiceError("upload_size");

  let meta: Metadata;
  try {
    meta = await sharp(input, { limitInputPixels: 50_000_000 }).metadata();
  } catch {
    throw new ServiceError("upload_type");
  }
  if (!meta.format || !ALLOWED_FORMATS.has(meta.format)) throw new ServiceError("upload_type");
  if ((meta.width ?? 0) < 400 || (meta.height ?? 0) < 300) throw new ServiceError("upload_small");

  const { data, info } = await sharp(input, { limitInputPixels: 50_000_000 })
    .rotate()
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer({ resolveWithObject: true });

  return { buffer: data, width: info.width, height: info.height, mimeType: "image/webp" };
}

/** Square 512 px profile photo; same validation and metadata stripping as listing photos. */
export async function processAvatar(input: Buffer, declaredType: string): Promise<ProcessedImage> {
  if (!(ALLOWED_MIME as readonly string[]).includes(declaredType)) throw new ServiceError("upload_type");
  if (input.byteLength === 0) throw new ServiceError("upload_empty");
  if (input.byteLength > MAX_UPLOAD_BYTES) throw new ServiceError("upload_size");
  let meta: Metadata;
  try {
    meta = await sharp(input, { limitInputPixels: 50_000_000 }).metadata();
  } catch {
    throw new ServiceError("upload_type");
  }
  if (!meta.format || !ALLOWED_FORMATS.has(meta.format)) throw new ServiceError("upload_type");
  if ((meta.width ?? 0) < 200 || (meta.height ?? 0) < 200) throw new ServiceError("upload_small");
  const { data, info } = await sharp(input, { limitInputPixels: 50_000_000 })
    .rotate()
    .resize({ width: 512, height: 512, fit: "cover", position: "attention" })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });
  return { buffer: data, width: info.width, height: info.height, mimeType: "image/webp" };
}

/** Random, non-guessable object name scoped by purpose and owner record. */
export function objectKey(prefix: "listings" | "avatars", ownerId: string) {
  const safeOwner = ownerId.replace(/[^a-z0-9]/gi, "").toLowerCase().slice(0, 40) || "x";
  return `${prefix}/${safeOwner}/${Date.now().toString(36)}-${randomBytes(9).toString("hex")}.webp`;
}
