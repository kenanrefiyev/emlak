"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Images, X } from "lucide-react";

interface Img {
  url: string;
  width: number;
  height: number;
}

/**
 * Homelengo-style 3-up photo row (scrollable on mobile) with a full-screen
 * viewer. Arrow keys move between photos inside the viewer.
 */
export function Gallery({ images, title }: { images: Img[]; title: string }) {
  const t = useTranslations("listing");
  const c = useTranslations("common");
  const [index, setIndex] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (index !== null && !d.open) d.showModal();
    if (index === null && d.open) d.close();
  }, [index]);

  if (!images.length) return <div className="grid aspect-[3/1] place-items-center rounded-2xl bg-gray text-ink-2">{c("noPhoto")}</div>;
  const go = (d: number) => setIndex((i) => (i === null ? 0 : (i + d + images.length) % images.length));
  const shown = images.slice(0, 3);

  return (
    <section aria-label={t("gallery")}>
      <div className="relative">
        <ul className="flex snap-x gap-2.5 overflow-x-auto pb-1 md:grid md:overflow-visible md:pb-0" style={{ gridTemplateColumns: `repeat(${shown.length}, minmax(0, 1fr))` }}>
          {shown.map((img, i) => (
            <li key={img.url} className="w-[85%] shrink-0 snap-start md:w-auto">
              <button type="button" onClick={() => setIndex(i)} className="relative block aspect-[4/3] w-full overflow-hidden rounded-2xl bg-gray md:aspect-[9/10]" aria-label={`${c("photo", { index: i + 1 })} — ${t("showAllPhotos", { count: images.length })}`}>
                <Image src={img.url} alt={i === 0 ? title : ""} fill priority={i === 0} sizes="(min-width: 768px) 33vw, 85vw" className="object-cover transition-transform duration-700 hover:scale-105" />
              </button>
            </li>
          ))}
        </ul>
        {images.length > 1 && (
          <button type="button" onClick={() => setIndex(0)} className="btn btn-sm absolute right-4 bottom-4 border-paper bg-paper text-ink shadow-pop hover:bg-paper">
            <Images className="size-4" aria-hidden />
            {t("showAllPhotos", { count: images.length })}
          </button>
        )}
      </div>

      <dialog
        ref={dialog}
        onClose={() => setIndex(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") go(-1);
          if (e.key === "ArrowRight") go(1);
        }}
        className="m-0 h-dvh max-h-none w-screen max-w-none bg-ink/95 p-0 text-white backdrop:bg-ink/80"
        aria-label={t("gallery")}
      >
        {index !== null && images[index] && (
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between px-4 py-3">
              <p className="text-sm" aria-live="polite">
                {index + 1} / {images.length}
              </p>
              <button type="button" onClick={() => setIndex(null)} className="grid size-11 place-items-center rounded-full bg-white/10 hover:bg-white/20" aria-label={c("close")}>
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <div className="relative flex-1">
              <Image key={images[index].url} src={images[index].url} alt={`${title} — ${c("photo", { index: index + 1 })}`} fill sizes="100vw" className="object-contain" />
              {images.length > 1 && (
                <>
                  <button type="button" onClick={() => go(-1)} aria-label={t("prevPhoto")} className="absolute top-1/2 left-3 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-white/15 hover:bg-white/25">
                    <ChevronLeft className="size-6" aria-hidden />
                  </button>
                  <button type="button" onClick={() => go(1)} aria-label={t("nextPhoto")} className="absolute top-1/2 right-3 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-white/15 hover:bg-white/25">
                    <ChevronRight className="size-6" aria-hidden />
                  </button>
                </>
              )}
            </div>
            <ul className="flex justify-center gap-2 overflow-x-auto p-3">
              {images.map((img, i) => (
                <li key={img.url} className="shrink-0">
                  <button type="button" onClick={() => setIndex(i)} aria-current={i === index ? "true" : undefined} aria-label={c("photo", { index: i + 1 })} className="relative block h-14 w-20 overflow-hidden rounded-lg opacity-60 aria-[current=true]:opacity-100 aria-[current=true]:ring-2 aria-[current=true]:ring-white">
                    <Image src={img.url} alt="" fill sizes="80px" className="object-cover" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </dialog>
    </section>
  );
}
