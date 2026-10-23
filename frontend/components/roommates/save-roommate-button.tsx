"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Heart } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { toggleSavedRoommateAction } from "@/app/[locale]/listings/actions";

/** Bookmark for a roommate profile; persisted per account (see /account/saved). */
export function SaveRoommateButton({ adId, initialSaved, loggedIn }: { adId: string; initialSaved: boolean; loggedIn: boolean }) {
  const t = useTranslations("roommates");
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [optimistic, setOptimistic] = useOptimistic(saved);
  const [failed, setFailed] = useState(false);
  const [, startTransition] = useTransition();

  function onClick() {
    if (!loggedIn) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    const next = !saved;
    startTransition(async () => {
      setOptimistic(next);
      const res = await toggleSavedRoommateAction(adId, next);
      setFailed(!res.ok);
      if (res.ok) setSaved(next);
    });
  }

  return (
    <div>
      <button type="button" onClick={onClick} aria-pressed={optimistic} className="btn btn-outline w-full">
        <Heart className={`size-5 ${optimistic ? "fill-danger text-danger" : ""}`} aria-hidden />
        {optimistic ? t("unsaveProfile") : t("saveProfile")}
      </button>
      {failed && (
        <p role="alert" className="mt-2 text-sm font-medium text-danger">
          {t("saveFailed")}
        </p>
      )}
    </div>
  );
}
