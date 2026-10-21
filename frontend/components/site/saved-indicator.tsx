"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { CircleAlert, Heart } from "lucide-react";
import { Link } from "@/i18n/navigation";

/**
 * Save buttons and the header talk through one window event, so a heart on
 * any card can update the header badge and show a confirmation without a
 * shared React context or a page refresh.
 */
const EVENT = "yuva:saved";

type SavedDetail = { ok: true; saved: boolean; count: number } | { ok: false };

export function announceSaved(detail: SavedDetail) {
  window.dispatchEvent(new CustomEvent<SavedDetail>(EVENT, { detail }));
}

/** Subscribes for the component's lifetime; `handler` must only touch state setters and refs. */
function onSaved(handler: (d: SavedDetail) => void) {
  const listener = (e: Event) => handler((e as CustomEvent<SavedDetail>).detail);
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}

/** Header heart with the live number of saved listings. */
export function SavedLink({ initialCount }: { initialCount: number }) {
  const t = useTranslations("nav");
  const [count, setCount] = useState(initialCount);
  // A server render (navigation, refresh) brings a fresh count; adopt it.
  const [serverCount, setServerCount] = useState(initialCount);
  if (serverCount !== initialCount) {
    setServerCount(initialCount);
    setCount(initialCount);
  }
  useEffect(() => onSaved((d) => d.ok && setCount(d.count)), []);

  return (
    <Link href="/account/saved" className="icon-btn relative !rounded-full" aria-label={t("savedCount", { count })} title={t("saved")}>
      <Heart className={`size-5 ${count ? "fill-danger text-danger" : ""}`} aria-hidden />
      {count > 0 && (
        <span
          aria-hidden
          className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-danger px-1 text-[11px] font-bold leading-none text-white tabular-nums"
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}

/** Short confirmation after saving or un-saving a listing. */
export function SavedToaster() {
  const t = useTranslations("card");
  const [toast, setToast] = useState<(SavedDetail & { key: number }) | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const off = onSaved((d) => {
      clearTimeout(timer.current);
      setToast({ ...d, key: Date.now() });
      timer.current = setTimeout(() => setToast(null), 3500);
    });
    return () => {
      off();
      clearTimeout(timer.current);
    };
  }, []);

  return (
    <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-0 bottom-5 z-50 flex justify-center px-4">
      {toast && (
        <div
          key={toast.key}
          className="pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-sm text-white shadow-lg motion-safe:animate-[toast-in_180ms_ease-out]"
        >
          {toast.ok ? (
            <>
              <Heart className={`size-5 shrink-0 ${toast.saved ? "fill-danger text-danger" : ""}`} aria-hidden />
              <span>{toast.saved ? t("savedToast") : t("unsavedToast")}</span>
              <Link href="/account/saved" className="ml-1 whitespace-nowrap font-semibold text-white underline underline-offset-2">
                {t("viewSaved")} ({toast.count})
              </Link>
            </>
          ) : (
            <>
              <CircleAlert className="size-5 shrink-0 text-danger" aria-hidden />
              <span>{t("saveFailed")}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
