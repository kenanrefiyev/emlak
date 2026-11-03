"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { numberTags, type AppLocale } from "@/i18n/routing";
import { COUNTRY_COOKIE_MAX_AGE } from "@/lib/market";
import { CURRENCY_COOKIE, convert, currencySymbol, type Rates } from "@/lib/money";
import { Picker } from "./picker";

export interface CurrencyInfo {
  currencies: string[];
  display: string;
  rates: Rates | null;
  ratesUpdatedAt: string | null;
  /** The update time, formatted on the server (browsers lack some locales' date data, e.g. az). */
  ratesUpdatedLabel: string | null;
  source: { name: string; url: string };
}

function rememberCurrency(code: string) {
  document.cookie = `${CURRENCY_COOKIE}=${code}; path=/; max-age=${COUNTRY_COOKIE_MAX_AGE}; samesite=lax`;
}

/**
 * Display-currency choice. Only changes how prices are shown (converted and
 * marked approximate); listings keep their own price and currency. The choice
 * is a cookie, cleared when the visitor changes market.
 */
export function CurrencySwitcher({ info, variant = "compact" }: { info: CurrencyInfo; variant?: "compact" | "list" }) {
  const t = useTranslations("currency");
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function change(code: string) {
    rememberCurrency(code);
    startTransition(() => router.refresh());
  }

  const others = info.currencies.filter((c) => c !== info.display);
  const fmt = new Intl.NumberFormat(numberTags[locale], { maximumFractionDigits: 4, maximumSignificantDigits: 4 });
  const footer = info.rates ? (
    <>
      {others.map((c) => {
        const v = convert(1, info.display, c, info.rates);
        return v == null ? null : (
          <span key={c} className="block font-semibold text-ink">
            {t("rateLine", { from: info.display, value: fmt.format(v), to: c })}
          </span>
        );
      })}
      {info.ratesUpdatedLabel && <span className="block">{t("updated", { date: info.ratesUpdatedLabel })}</span>}
      <span className="block">
        {t("source")}:{" "}
        <a href={info.source.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-brand">
          {info.source.name}
        </a>
      </span>
      <span className="mt-1 block">{t("disclaimer")}</span>
    </>
  ) : (
    <span className="block">{t("unavailable")}</span>
  );

  const options = info.currencies.map((c) => ({
    value: c,
    label: `${c} · ${t(`names.${c}` as "names.AZN")}`,
    icon: <span className="grid w-5 place-items-center text-base font-semibold">{currencySymbol(c)}</span>,
  }));

  if (variant === "list") {
    return (
      <div>
        <div role="group" aria-label={t("label")} className="grid grid-cols-2 gap-2">
          {info.currencies.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => change(c)}
              aria-pressed={c === info.display}
              disabled={pending}
              className="btn btn-sm justify-start gap-2.5 border-line !px-3 aria-pressed:border-brand aria-pressed:bg-brand-soft aria-pressed:text-brand"
            >
              <span className="w-4 text-center font-semibold">{currencySymbol(c)}</span>
              {c}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs leading-relaxed text-ink-2">{footer}</p>
      </div>
    );
  }

  return (
    <Picker
      label={t("label")}
      value={info.display}
      disabled={pending}
      onChange={change}
      options={options}
      footer={footer}
      trigger={
        <>
          <span className="font-semibold">{currencySymbol(info.display)}</span>
          <span>{info.display}</span>
        </>
      }
    />
  );
}
