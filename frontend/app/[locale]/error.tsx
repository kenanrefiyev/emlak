"use client";

import { useTranslations } from "next-intl";

export default function LocaleError({ reset }: { error: Error; reset: () => void }) {
  const t = useTranslations("errorPage");
  const c = useTranslations("common");
  return (
    <div className="shell py-24" role="alert">
      <h1 className="t-h2">{t("title")}</h1>
      <p className="mt-3 text-ink-2">{t("body")}</p>
      <button type="button" onClick={reset} className="btn btn-primary mt-8">
        {c("retry")}
      </button>
    </div>
  );
}
