import { getTranslations } from "next-intl/server";
import { MapPin } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import type { RoommateCardData } from "@/server/roommates/queries";
import { formatShortDate } from "@/lib/format";
import { displayPrice, displayRangeText } from "@/lib/money";
import { getMoneyView } from "@/server/money";
import { MetroDot } from "@/components/listings/category-tag";

/** Roommate ad in the same card language as listings (no photo: people, not rooms). */
export async function RoommateCard({ ad, locale }: { ad: RoommateCardData; locale: AppLocale }) {
  const [t, r, c, cat, cur, money] = await Promise.all([
    getTranslations({ locale, namespace: "enums" }),
    getTranslations({ locale, namespace: "roommates" }),
    getTranslations({ locale, namespace: "common" }),
    getTranslations({ locale, namespace: "categories" }),
    getTranslations({ locale, namespace: "currency" }),
    getMoneyView(),
  ]);
  const hasPlace = ad.type === "HAS_PLACE";
  // Amounts are in the ad's own currency; shown converted (and marked) when the visitor views another.
  const share = hasPlace && ad.monthlyContribution != null ? displayPrice(ad.monthlyContribution, ad.currency, money, locale) : null;
  const range = !hasPlace && ad.budgetMin != null && ad.budgetMax != null ? displayRangeText(ad.budgetMin, ad.budgetMax, ad.currency, money, locale) : null;
  const initial = ad.firstName.charAt(0).toLocaleUpperCase(locale);
  const facts = [
    ad.homeType ? { label: hasPlace ? r("homeType") : r("desiredHome"), value: cat(ad.homeType) } : null,
    hasPlace && ad.availableSpaces != null ? { label: r("availableSpaces"), value: String(ad.availableSpaces) } : null,
    !hasPlace && ad.groupSize != null ? { label: r("groupSize"), value: c("people", { count: ad.groupSize }) } : null,
    { label: r("moveIn"), value: formatShortDate(ad.moveInDate, locale) },
    { label: r("duration"), value: c("months", { count: ad.durationMonths }) },
  ].filter((x) => x !== null);

  return (
    <article className="group relative flex h-full flex-col rounded-2xl border border-line bg-paper p-5 transition-colors hover:border-brand">
      <div className="flex items-center gap-3">
        <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-full bg-mist text-lg font-bold text-brand">
          {initial}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">
            {ad.firstName}
            {ad.university && <span className="font-normal text-ink-2"> · {ad.university}</span>}
          </p>
          <p className="text-sm text-ink-2">{t(`roommateTypeShort.${ad.type}`)}</p>
        </div>
        {ad.match ? (
          <span className="tag shrink-0 bg-ok-soft text-ok" title={r("matchDisclaimer")}>
            {r("match", { score: ad.match.score })}
          </span>
        ) : ad.isDemo ? (
          <span className="tag shrink-0 bg-gray text-ink-2" title={c("demoHint")}>
            {c("demo")}
          </span>
        ) : null}
      </div>

      <h3 className="mt-4 text-lg leading-snug font-semibold" lang={ad.originalLocale}>
        <Link href={`/roommates/${ad.id}`} className="line-clamp-2 transition-colors after:absolute after:inset-0 after:content-[''] group-hover:text-brand">
          {ad.title}
        </Link>
      </h3>

      <ul className="mt-3 space-y-1.5 text-sm">
        {facts.map((f) => (
          <li key={f.label} className="flex justify-between gap-3">
            <span className="text-ink-2">{f.label}:</span>
            <span className="text-right font-semibold">{f.value}</span>
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-4">
        <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
          <span className="flex min-w-0 items-center gap-1.5 text-sm text-ink-2">
            {ad.metro ? <MetroDot line={ad.metro.line} /> : <MapPin className="size-4 shrink-0" aria-hidden />}
            <span className="truncate">{[ad.metro ? `${ad.metro.name} m.` : null, ad.area, ad.city].filter(Boolean).join(", ")}</span>
          </span>
          <span className="shrink-0 text-right">
            <span className="t-price block text-lg">
              {share?.approximate && <span aria-label={cur("approx")}>≈ </span>}
              {share ? share.main : range}
              <span className="text-sm font-normal text-ink-2">{c("perMonth")}</span>
            </span>
            {share?.approximate && <span className="block text-xs text-ink-2">{cur("original", { price: share.original })}</span>}
          </span>
        </div>
      </div>
    </article>
  );
}
