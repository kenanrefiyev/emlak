"use client";

import { useTranslations } from "next-intl";
import { CloudOff } from "lucide-react";

export default function SearchError({ reset }: { error: Error; reset: () => void }) {
  const t = useTranslations("search");
  const c = useTranslations("common");
  return (
    <div className="shell py-20">
      <div role="alert" className="mx-auto flex max-w-lg flex-col items-start gap-3 rounded-2xl border border-line bg-gray p-8 sm:items-center sm:text-center">
        <CloudOff className="size-8 text-ink-3" aria-hidden />
        <h1 className="t-h3">{t("errorTitle")}</h1>
        <p className="text-ink-2">{t("errorBody")}</p>
        <button type="button" onClick={reset} className="btn btn-primary mt-2">
          {c("retry")}
        </button>
      </div>
    </div>
  );
}
