"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Heart } from "lucide-react";
import { useRouter, usePathname } from "@/i18n/navigation";
import { toggleSavedAction } from "@/app/[locale]/listings/actions";
import { announceSaved } from "@/components/site/saved-indicator";

export function SaveButton({ listingId, initialSaved, loggedIn, variant = "icon" }: { listingId: string; initialSaved: boolean; loggedIn: boolean; variant?: "icon" | "button" | "square" }) {
  const t = useTranslations("card");
  const router = useRouter();
  const pathname = usePathname();
  const [saved, setSaved] = useState(initialSaved);
  const [optimistic, setOptimistic] = useOptimistic(saved);
  const [, startTransition] = useTransition();

  function onClick() {
    if (!loggedIn) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }
    const next = !saved;
    startTransition(async () => {
      setOptimistic(next);
      const res = await toggleSavedAction(listingId, next);
      if (res.ok) setSaved(next);
      announceSaved(res.ok && res.count !== undefined ? { ok: true, saved: next, count: res.count } : { ok: false });
      if (pathname === "/account/saved") router.refresh();
    });
  }

  const label = optimistic ? t("unsave") : t("save");
  if (variant === "square") {
    return (
      <button type="button" onClick={onClick} aria-pressed={optimistic} aria-label={label} title={label} className="icon-btn">
        <Heart className={`size-5 ${optimistic ? "fill-danger text-danger" : ""}`} aria-hidden />
      </button>
    );
  }
  if (variant === "button") {
    return (
      <button type="button" onClick={onClick} aria-pressed={optimistic} className="btn btn-outline">
        <Heart className={`size-5 ${optimistic ? "fill-danger text-danger" : ""}`} aria-hidden />
        {label}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={optimistic}
      aria-label={label}
      title={label}
      className="grid size-10 place-items-center rounded-full bg-paper text-ink transition-colors hover:bg-brand hover:text-white"
    >
      <Heart className={`size-[1.15rem] ${optimistic ? "fill-danger text-danger" : ""}`} aria-hidden />
    </button>
  );
}
