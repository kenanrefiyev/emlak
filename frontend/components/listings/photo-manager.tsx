"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ArrowLeft, ArrowRight, ImagePlus, Star, Trash2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";

interface Img {
  id: string;
  url: string;
  width: number;
  height: number;
}

const MAX_CLIENT_EDGE = 2560;
const DOWNSCALE_OVER = 3.5 * 1024 * 1024;

/** Large photos are downscaled in the browser before upload to stay under host body limits. */
async function prepare(file: File): Promise<File> {
  if (file.size <= DOWNSCALE_OVER || !/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_CLIENT_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.88));
    return blob ? new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" }) : file;
  } catch {
    return file;
  }
}

export function PhotoManager({ listingId, initial, onChange }: { listingId: string; initial: Img[]; onChange?: (count: number) => void }) {
  const t = useTranslations("listingForm");
  const errs = useTranslations("errors");
  const router = useRouter();
  const [images, setImages] = useState(initial);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const input = useRef<HTMLInputElement>(null);
  const base = `/api/listings/${listingId}/images`;
  useEffect(() => onChange?.(images.length), [images.length, onChange]);

  const msg = (code: string) => (errs.has(code as never) ? errs(code as "generic") : errs("upload_failed"));

  async function upload(files: FileList) {
    const list = [...files];
    setErrors([]);
    setProgress({ done: 0, total: list.length });
    const failed: string[] = [];
    for (const [i, raw] of list.entries()) {
      const file = await prepare(raw);
      const body = new FormData();
      body.set("file", file);
      try {
        const res = await fetch(base, { method: "POST", body });
        const json = (await res.json().catch(() => ({}))) as { image?: Img; error?: string };
        if (res.ok && json.image) setImages((prev) => [...prev, json.image!]);
        else failed.push(t("uploadFailed", { name: raw.name, reason: msg(json.error ?? "upload_failed") }));
      } catch {
        failed.push(t("uploadFailed", { name: raw.name, reason: msg("upload_failed") }));
      }
      setProgress({ done: i + 1, total: list.length });
    }
    setErrors(failed);
    setProgress(null);
    if (input.current) input.current.value = "";
    router.refresh();
  }

  async function remove(id: string) {
    const res = await fetch(`${base}/${id}`, { method: "DELETE" });
    if (res.ok) {
      setImages((prev) => prev.filter((i) => i.id !== id));
      router.refresh();
    } else {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      setErrors([msg(json.error ?? "generic")]);
    }
  }

  async function reorder(next: Img[]) {
    const prev = images;
    setImages(next);
    const res = await fetch(base, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order: next.map((i) => i.id) }) });
    if (!res.ok) setImages(prev);
  }

  const move = (from: number, to: number) => {
    const next = [...images];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item!);
    void reorder(next);
  };

  return (
    <div>
      <p className="text-ink-2">{t("photosLead")}</p>
      {images.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-line-strong bg-gray px-4 py-8 text-center text-ink-2">{t("noPhotos")}</p>
      ) : (
        <ol className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((img, i) => (
            <li key={img.id} className="overflow-hidden rounded-xl border border-line">
              <div className="relative aspect-[4/3] bg-mist">
                <Image src={img.url} alt={`${t("photosTitle")} ${i + 1}`} fill sizes="(min-width: 1024px) 220px, 45vw" className="object-cover" />
                {i === 0 && (
                  <span className="tag absolute top-2 left-2 bg-ink text-white">
                    <Star className="size-3" aria-hidden /> 1
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-1 p-1.5">
                <div className="flex">
                  <button type="button" className="btn btn-ghost !min-h-10 !px-2.5" disabled={i === 0} onClick={() => move(i, i - 1)} aria-label={t("moveLeft")}>
                    <ArrowLeft className="size-4" aria-hidden />
                  </button>
                  <button type="button" className="btn btn-ghost !min-h-10 !px-2.5" disabled={i === images.length - 1} onClick={() => move(i, i + 1)} aria-label={t("moveRight")}>
                    <ArrowRight className="size-4" aria-hidden />
                  </button>
                  {i > 0 && (
                    <button type="button" className="btn btn-ghost !min-h-10 !px-2.5" onClick={() => move(i, 0)} aria-label={t("makeCover")} title={t("makeCover")}>
                      <Star className="size-4" aria-hidden />
                    </button>
                  )}
                </div>
                <button type="button" className="btn btn-ghost !min-h-10 !px-2.5 text-danger" onClick={() => remove(img.id)} aria-label={t("removePhoto")}>
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className={`btn btn-outline ${images.length >= 12 || progress ? "pointer-events-none opacity-50" : "cursor-pointer"}`}>
          <ImagePlus className="size-4" aria-hidden />
          {t("addPhotos")}
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            multiple
            className="sr-only"
            disabled={images.length >= 12 || Boolean(progress)}
            onChange={(ev) => ev.target.files?.length && void upload(ev.target.files)}
          />
        </label>
        {progress && (
          <p role="status" className="text-sm text-ink-2">
            {t("uploading", progress)}
          </p>
        )}
      </div>
      {errors.length > 0 && (
        <ul role="alert" className="mt-3 space-y-1 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
          {errors.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
