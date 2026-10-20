import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { requireUser } from "@/server/auth/current";
import { MIN_IMPRESSIONS_FOR_RATE, MIN_VIEWS_FOR_RATE, RANGES, parseRange, statistics } from "@/server/dashboard";
import { EmptyState } from "@/components/site/section";
import { BarChart } from "@/components/dashboard/bar-chart";
import { ListingStatusBadge } from "@/components/dashboard/lead-badge";

type Props = { params: Promise<{ locale: AppLocale }>; searchParams: Promise<{ range?: string }> };

export default async function StatisticsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireUser(locale);
  const range = parseRange((await searchParams).range);
  const [t, data] = await Promise.all([getTranslations({ locale, namespace: "dashboard" }), statistics(user.id, locale, range)]);
  const pct = (v: number | null) => (v === null ? "—" : new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 }).format(v));
  const n = (v: number) => v.toLocaleString(locale);

  const audience = [
    { label: t("stats.impressions"), value: data.totals.IMPRESSION, hint: t("stats.impressionsHint") },
    { label: t("stats.views"), value: data.totals.VIEW, hint: t("stats.viewsHint") },
    { label: t("stats.saves"), value: data.totals.SAVE, hint: t("stats.savesHint") },
  ];
  const contact = [
    { label: t("stats.inquiries"), value: data.totals.inquiries, hint: t("stats.inquiriesHint"), strong: true },
    { label: t("stats.phoneReveals"), value: data.totals.PHONE_REVEAL, hint: t("stats.phoneRevealsHint") },
    { label: t("stats.whatsapp"), value: data.totals.WHATSAPP_CLICK, hint: t("stats.whatsappHint") },
  ];

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="t-h2">{t("nav.statistics")}</h1>
          <p className="mt-1 text-sm text-ink-2">{t("stats.lead")}</p>
        </div>
        <nav aria-label={t("stats.range")} className="flex rounded-full border border-line p-1">
          {RANGES.map((r) => (
            <Link
              key={r}
              href={r === 30 ? "/dashboard/statistics" : `/dashboard/statistics?range=${r}`}
              aria-current={range === r ? "page" : undefined}
              className="grid min-h-9 min-w-16 place-items-center rounded-full px-3 text-sm font-semibold text-ink-2 hover:text-ink aria-[current=page]:bg-ink aria-[current=page]:text-white"
            >
              {t("stats.days", { count: r })}
            </Link>
          ))}
        </nav>
      </div>

      <section aria-labelledby="aud-h">
        <h2 id="aud-h" className="t-h3">
          {t("stats.audience")}
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-3">
          {audience.map((x) => (
            <li key={x.label} className="rounded-xl border border-line p-4">
              <span className="block text-sm text-ink-2">{x.label}</span>
              <span className="t-price mt-1 block text-2xl tabular-nums">{n(x.value)}</span>
              <span className="mt-1 block text-xs text-ink-3">{x.hint}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="con-h">
        <h2 id="con-h" className="t-h3">
          {t("stats.contact")}
        </h2>
        <p className="mt-1 text-sm text-ink-2">{t("stats.contactNote")}</p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-3">
          {contact.map((x) => (
            <li key={x.label} className={`rounded-xl border p-4 ${x.strong ? "border-brand bg-brand-soft/40" : "border-line"}`}>
              <span className="block text-sm text-ink-2">{x.label}</span>
              <span className="t-price mt-1 block text-2xl tabular-nums">{n(x.value)}</span>
              <span className="mt-1 block text-xs text-ink-3">{x.hint}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-mist px-4 py-3">
            <dt className="text-sm text-ink-2">{t("stats.conversion")}</dt>
            <dd className="t-price text-xl">{pct(data.conversion)}</dd>
            <dd className="text-xs text-ink-3">{data.conversion === null ? t("stats.notEnough", { count: MIN_VIEWS_FOR_RATE }) : t("stats.conversionHint")}</dd>
          </div>
          <div className="rounded-xl bg-mist px-4 py-3">
            <dt className="text-sm text-ink-2">{t("stats.ctr")}</dt>
            <dd className="t-price text-xl">{pct(data.ctr)}</dd>
            <dd className="text-xs text-ink-3">{data.ctr === null ? t("stats.notEnoughImpr", { count: MIN_IMPRESSIONS_FOR_RATE }) : t("stats.ctrHint")}</dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="trend-h" className="grid gap-8 md:grid-cols-2">
        <h2 id="trend-h" className="sr-only">
          {t("trendTitle")}
        </h2>
        <BarChart title={t("series.views")} valueLabel={t("series.viewsUnit")} tableLabel={t("showTable")} locale={locale} points={data.series.map((d) => ({ day: d.day, value: d.VIEW }))} />
        <BarChart title={t("series.inquiries")} valueLabel={t("series.inquiriesUnit")} tableLabel={t("showTable")} locale={locale} points={data.series.map((d) => ({ day: d.day, value: d.CONTACT_REQUEST }))} />
        <BarChart title={t("series.impressions")} valueLabel={t("series.impressionsUnit")} tableLabel={t("showTable")} locale={locale} points={data.series.map((d) => ({ day: d.day, value: d.IMPRESSION }))} />
        <BarChart
          title={t("series.clicks")}
          valueLabel={t("series.clicksUnit")}
          tableLabel={t("showTable")}
          locale={locale}
          points={data.series.map((d) => ({ day: d.day, value: d.PHONE_REVEAL + d.WHATSAPP_CLICK }))}
        />
      </section>

      <section aria-labelledby="per-h">
        <h2 id="per-h" className="t-h3">
          {t("stats.perListing")}
        </h2>
        {data.rows.length === 0 ? (
          <div className="mt-4">
            <EmptyState title={t("stats.emptyTitle")} body={t("stats.emptyBody")} />
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-[52rem] text-left text-sm">
              <thead className="bg-gray text-ink-2">
                <tr>
                  <th className="px-3 py-3 font-medium">{t("columns.listing")}</th>
                  <th className="px-3 py-3 text-right font-medium">{t("stats.impressions")}</th>
                  <th className="px-3 py-3 text-right font-medium">{t("stats.views")}</th>
                  <th className="px-3 py-3 text-right font-medium">{t("stats.saves")}</th>
                  <th className="px-3 py-3 text-right font-medium">{t("stats.inquiries")}</th>
                  <th className="px-3 py-3 text-right font-medium">{t("stats.clicksShort")}</th>
                  <th className="px-3 py-3 text-right font-medium">{t("stats.conversion")}</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => (
                  <tr key={r.id} className="border-t border-line">
                    <td className="max-w-80 px-3 py-2.5">
                      <Link href={`/dashboard/listings/${r.id}/edit`} className="line-clamp-1 font-medium hover:text-brand">
                        {r.title}
                      </Link>
                      <ListingStatusBadge status={r.status} />
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{n(r.IMPRESSION)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{n(r.VIEW)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{n(r.SAVE)}</td>
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{n(r.inquiries)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{n(r.PHONE_REVEAL + r.WHATSAPP_CLICK)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{pct(r.conversion)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 hint">{t("stats.footnote")}</p>
      </section>
    </div>
  );
}
