"use client";

import { useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { localeFlags, localeNames, locales, type AppLocale } from "@/i18n/routing";
import { Flag } from "./flag";
import { Picker } from "./picker";

/**
 * Switches language while keeping the current page and its query (filters).
 * next-intl's middleware stores the choice in the locale cookie on navigation.
 * The visitor's market (country) is never touched.
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
            disabled={pending}
            className="btn btn-sm justify-start gap-2.5 border-line !px-3 aria-pressed:border-brand aria-pressed:bg-brand-soft aria-pressed:text-brand"
          >
            <Flag code={localeFlags[l]} />
            {localeNames[l]}
          </button>
        ))}
      </div>
    );
  }

  return (
    <Picker
      label={t("language")}
      value={locale}
      disabled={pending}
      onChange={(v) => change(v as AppLocale)}
      options={locales.map((l) => ({ value: l, label: localeNames[l], lang: l, icon: <Flag code={localeFlags[l]} /> }))}
      trigger={
        <>
          <Flag code={localeFlags[locale]} />
          <span>{locale.toUpperCase()}</span>
        </>
      }
    />
  );
}
