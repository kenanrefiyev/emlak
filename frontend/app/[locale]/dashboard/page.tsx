import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight, Clock3, Inbox, Plus } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { requireUser } from "@/server/auth/current";
import { dailyEvents, dashboardKind, dashboardOverview } from "@/server/dashboard";
import { formatDate, formatShortDate } from "@/lib/format";
import { FormSuccess } from "@/components/forms/action-form";
import { BarChart } from "@/components/dashboard/bar-chart";
import { LeadBadge } from "@/components/dashboard/lead-badge";
import { OpButton } from "@/components/account/op-button";
import { listingOpAction } from "@/app/[locale]/account/actions";

export default async function DashboardOverview({ params, searchParams }: { params: Promise<{ locale: AppLocale }>; searchParams: Promise<{ welcome?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireUser(locale);
  const kind = dashboardKind(user.role);
  const [t, auth, data, series] = await Promise.all([
    getTranslations({ locale, namespace: "dashboard" }),
    getTranslations({ locale, namespace: "auth" }),
    dashboardOverview(user.id, locale),
    dailyEvents(user.id, 30),
  ]);
  const { welcome } = await searchParams;
  const { totals } = data;
  const isNew = totals.total === 0;

  const tiles = [
    { label: t("tiles.total"), value: totals.total, href: "/dashboard/listings" },
    { label: t("tiles.active"), value: totals.active, href: "/dashboard/listings?status=ACTIVE" },
    { label: t("tiles.pending"), value: totals.pending, href: "/dashboard/listings?status=PENDING_REVIEW" },
    { label: t("tiles.unavailable"), value: totals.unavailable, href: "/dashboard/listings?status=RENTED", hint: t("tiles.unavailableHint") },
    { label: t("tiles.views"), value: totals.views, href: "/dashboard/statistics", hint: t("tiles.viewsHint", { count: totals.views30 }) },
    { label: t("tiles.inquiries"), value: totals.inquiries, href: "/dashboard/inquiries", hint: t("tiles.inquiriesHint", { count: totals.inquiriesNew }) },
  ];

  return (
    <div className="space-y-10">
      {welcome && <FormSuccess message={auth("registered")} />}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-brand">{kind === "realtor" ? t("kind.realtor") : t("kind.landlord")}</p>
          <h1 className="t-h2 mt-1">{t("greeting", { name: user.name.split(" ")[0] ?? user.name })}</h1>
          <p className="mt-1 text-ink-2">{isNew ? t("leadNew") : kind === "realtor" ? t("leadRealtor") : t("leadLandlord")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/listings/new" className="btn btn-primary btn-sm">
            <Plus className="size-4" aria-hidden />
            {t("addListing")}
          </Link>
          <Link href="/dashboard/listings" className="btn btn-outline btn-sm">
            {t("manageListings")}
          </Link>
          <Link href="/dashboard/inquiries" className="btn btn-outline btn-sm">
            {t("viewInquiries")}
          </Link>
        </div>
      </div>

      {isNew ? (
        <section className="rounded-2xl border border-dashed border-line-strong p-6 sm:p-8" aria-labelledby="start-h">
          <h2 id="start-h" className="t-h3">
            {t("start.title")}
          </h2>
          <ol className="mt-4 grid gap-4 sm:grid-cols-3">
            {(["one", "two", "three"] as const).map((k, i) => (
              <li key={k} className="rounded-xl bg-mist p-4">
                <span className="grid size-8 place-items-center rounded-full bg-brand text-sm font-bold text-white">{i + 1}</span>
                <p className="mt-3 font-semibold">{t(`start.${k}Title`)}</p>
                <p className="mt-1 text-sm text-ink-2">{t(`start.${k}Body`)}</p>
              </li>
            ))}
          </ol>
          <Link href="/dashboard/listings/new" className="btn btn-primary mt-6">
            {t("start.cta")}
          </Link>
        </section>
      ) : (
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {tiles.map((tile) => (
            <li key={tile.label}>
              <Link href={tile.href} className="block h-full rounded-xl border border-line p-4 transition-colors hover:border-brand sm:p-5">
                <span className="block text-sm text-ink-2">{tile.label}</span>
                <span className="t-price mt-1 block text-2xl tabular-nums sm:text-3xl">{tile.value.toLocaleString(locale)}</span>
                {tile.hint && <span className="mt-1 block text-xs text-ink-3">{tile.hint}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {!isNew && (
        <section aria-labelledby="trend-h">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="trend-h" className="t-h3">
              {t("trendTitle")}
            </h2>
            <Link href="/dashboard/statistics" className="text-sm font-semibold text-brand hover:underline">
              {t("allStatistics")}
            </Link>
          </div>
          <div className="mt-4 grid gap-8 md:grid-cols-2">
            <BarChart title={t("series.views")} valueLabel={t("series.viewsUnit")} tableLabel={t("showTable")} locale={locale} points={series.map((d) => ({ day: d.day, value: d.VIEW }))} height={160} />
            <BarChart
              title={t("series.inquiries")}
              valueLabel={t("series.inquiriesUnit")}
              tableLabel={t("showTable")}
              locale={locale}
              points={series.map((d) => ({ day: d.day, value: d.CONTACT_REQUEST }))}
              height={160}
            />
          </div>
        </section>
      )}

      <div className="grid gap-10 lg:grid-cols-2">
        <section aria-labelledby="recent-h" className="min-w-0">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="recent-h" className="t-h3">
              {t("recentInquiries")}
            </h2>
            {data.recentInquiries.length > 0 && (
              <Link href="/dashboard/inquiries" className="text-sm font-semibold text-brand hover:underline">
                {t("seeAll")}
              </Link>
            )}
          </div>
          {data.recentInquiries.length === 0 ? (
            <div className="mt-4 rounded-xl bg-mist px-4 py-6 text-center">
              <Inbox className="mx-auto size-6 text-ink-3" aria-hidden />
              <p className="mt-2 text-sm text-ink-2">{t("noInquiries")}</p>
            </div>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {data.recentInquiries.map((r) => (
                <li key={r.id} className="py-3">
                  <Link href="/dashboard/inquiries" className="group block">
                    <span className="flex items-center gap-2">
                      <span className="font-semibold group-hover:text-brand">{r.name}</span>
                      <LeadBadge status={r.leadStatus} />
                      <span className="ml-auto text-xs text-ink-3">{formatShortDate(r.createdAt, locale)}</span>
                    </span>
                    <span className="mt-0.5 block truncate text-sm text-ink-2">{r.listingTitle}</span>
                    <span className="mt-0.5 block truncate text-sm text-ink-3">{r.message}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="expiring-h" className="min-w-0">
          <h2 id="expiring-h" className="t-h3">
            {t("expiringTitle")}
          </h2>
          {data.expiring.length === 0 ? (
            <p className="mt-4 rounded-xl bg-mist px-4 py-6 text-center text-sm text-ink-2">{t("noExpiring")}</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {data.expiring.map((l) => (
                <li key={l.id} className="flex items-center gap-3 py-3">
                  <Clock3 className="size-4 shrink-0 text-warn" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{l.title}</span>
                    <span className="text-sm text-ink-2">{t("expiresOn", { date: formatDate(l.expiresAt, locale) })}</span>
                  </span>
                  <span className="flex shrink-0">
                    <OpButton action={listingOpAction} id={l.id} op="renew" label={t("renew")} />
                  </span>
                </li>
              ))}
            </ul>
          )}

          <h2 className="t-h3 mt-10">{t("activityTitle")}</h2>
          {data.activity.length === 0 ? (
            <p className="mt-4 text-sm text-ink-2">{t("noActivity")}</p>
          ) : (
            <ol className="mt-3 space-y-3 border-l border-line pl-4">
              {data.activity.map((a, i) => (
                <li key={`${a.kind}-${a.href}-${i}`} className="relative text-sm">
                  <span className="absolute top-1.5 -left-[1.3rem] size-2 rounded-full bg-brand" aria-hidden />
                  <Link href={a.href} className="hover:underline">
                    <span className="font-medium">{t(`activity.${a.kind}`)}</span> <span className="text-ink-2">· {a.title}</span>
                  </Link>
                  <span className="block text-xs text-ink-3">{formatDate(a.at, locale)}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      {kind === "realtor" && (
        <p className="text-sm text-ink-3">
          <Link href="/dashboard/subscription" className="inline-flex items-center gap-1 font-semibold text-brand hover:underline">
            {t("realtorPlanLink")} <ArrowRight className="size-4" aria-hidden />
          </Link>
        </p>
      )}
    </div>
  );
}
