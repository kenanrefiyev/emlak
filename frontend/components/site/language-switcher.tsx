"use client";

import { useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Globe } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { localeNames, locales, type AppLocale } from "@/i18n/routing";

/**
 * Switches language while keeping the current page and its query (filters).
 * next-intl's middleware stores the choice in the locale cookie on navigation.
 */
export function LanguageSwitcher({ variant = "compact" }: { variant?: "compact" | "list" }) {
  const t = useTranslations("nav");
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const search = useSearchParams();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function change(next: AppLocale) {
    if (next === locale) return;
    const query = Object.fromEntries(search.entries());
    startTransition(() => router.replace({ pathname, query }, { locale: next, scroll: false }));
  }

  if (variant === "list") {
    return (
      <div role="group" aria-label={t("language")} className="grid grid-cols-2 gap-2">
        {locales.map((l) => (
          <button
            key={l}
            type="button"
            lang={l}
            onClick={() => change(l)}
            aria-pressed={l === locale}
            className="btn btn-sm border-line !px-3 aria-pressed:border-brand aria-pressed:bg-brand aria-pressed:text-white"
          >
            {localeNames[l]}
          </button>
        ))}
      </div>
    );
  }

  return (
    <label className="relative inline-flex min-h-[3.25rem] items-center gap-1.5 rounded-full border border-line px-4 text-[0.9375rem] font-semibold text-ink focus-within:border-brand hover:border-ink">
      <Globe className="size-4" aria-hidden />
      <span aria-hidden>{locale.toUpperCase()}</span>
      <span className="sr-only">{t("language")}</span>
      <select
        value={locale}
        disabled={pending}
        onChange={(e) => change(e.target.value as AppLocale)}
        className="absolute inset-0 cursor-pointer appearance-none opacity-0"
      >
        {locales.map((l) => (
          <option key={l} value={l} lang={l}>
            {localeNames[l]}
          </option>
        ))}
      </select>
    </label>
  );
}
