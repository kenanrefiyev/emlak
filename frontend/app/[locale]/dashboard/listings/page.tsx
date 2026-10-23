import { getTranslations, setRequestLocale } from "next-intl/server";
import { LayoutGrid, Plus, Rows3, Search } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { requireUser } from "@/server/auth/current";
import { db } from "@/server/db";
import { listingQuota } from "@/server/listings/service";
import { activeSubscription, featuredSlotsUsed } from "@/server/agents";
import { LISTING_SORT_KEYS, OWNER_STATUSES, dashboardKind, ownerListings, parseListingFilter } from "@/server/dashboard";
import { LISTING_CATEGORIES } from "@/lib/domain";
import { nameOf } from "@/lib/i18n-data";
import { formatAzn, formatDate } from "@/lib/format";
import { EmptyState } from "@/components/site/section";
import { Pagination } from "@/components/site/pagination";
import { ListingsBoard } from "@/components/dashboard/listings-board";

type Props = { params: Promise<{ locale: AppLocale }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function DashboardListings({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireUser(locale);
  const kind = dashboardKind(user.role);
  const f = parseListingFilter(await searchParams);
  const [t, cat, data, quota, used, sub, slotsUsed] = await Promise.all([
    getTranslations({ locale, namespace: "dashboard" }),
    getTranslations({ locale, namespace: "categories" }),
    ownerListings(user.id, locale, f),
    listingQuota(user),
    db.listing.count({ where: { ownerId: user.id, status: { in: ["PENDING_REVIEW", "PUBLISHED"] } } }),
    kind === "realtor" ? activeSubscription(user.id) : Promise.resolve(null),
    kind === "realtor" ? featuredSlotsUsed(user.id) : Promise.resolve(0),
  ]);
  const canFeature = Boolean(sub && slotsUsed < sub.package.featuredSlots);

  const query = (over: Record<string, string | number | undefined>) => {
    const q = new URLSearchParams();
    const merged = { q: f.q, status: f.status, category: f.category, sort: f.sort, view: f.view, ...over };
    for (const [k, v] of Object.entries(merged)) {
      if (v === undefined || v === "" || (k === "status" && v === "ALL") || (k === "sort" && v === "updated") || (k === "view" && v === "cards") || (k === "page" && String(v) === "1")) continue;
      q.set(k, String(v));
    }
    return q.toString();
  };
  const href = (over: Record<string, string | number | undefined>) => {
    const q = query({ page: undefined, ...over });
    return q ? `/dashboard/listings?${q}` : "/dashboard/listings";
  };
  const filtered = Boolean(f.q || f.category || f.status !== "ALL");

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="t-h2">{kind === "realtor" ? t("nav.portfolio") : t("nav.listings")}</h1>
          <p className="mt-1 text-sm text-ink-2">{t("quota", { used, limit: Number.isFinite(quota) ? quota : "∞" })}</p>
        </div>
        <Link href="/dashboard/listings/new" className="btn btn-primary btn-sm">
          <Plus className="size-4" aria-hidden />
          {t("addListing")}
        </Link>
      </div>

      <nav aria-label={t("filters.status")} className="-mx-1 mt-6 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {OWNER_STATUSES.map((s) => (
          <Link
            key={s}
            href={href({ status: s })}
            aria-current={f.status === s ? "page" : undefined}
            className="chip shrink-0 whitespace-nowrap hover:bg-brand-soft aria-[current=page]:border-brand aria-[current=page]:bg-brand aria-[current=page]:text-white"
          >
            {s === "ALL" ? t("filters.all") : t(`status.${s}`)}
            <span className="tabular-nums opacity-70">{data.statusCounts[s]}</span>
          </Link>
        ))}
      </nav>

      <form method="get" className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:items-end" role="search">
        {f.status !== "ALL" && <input type="hidden" name="status" value={f.status} />}
        {f.view !== "cards" && <input type="hidden" name="view" value={f.view} />}
        <label className="relative block">
          <span className="sr-only">{t("filters.search")}</span>
          <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-ink-3" aria-hidden />
          <input name="q" defaultValue={f.q ?? ""} placeholder={t("filters.searchPlaceholder")} maxLength={80} className="field !pl-11" />
        </label>
        <label>
          <span className="sr-only">{t("filters.category")}</span>
          <select name="category" defaultValue={f.category ?? ""} className="field">
            <option value="">{t("filters.anyCategory")}</option>
            {LISTING_CATEGORIES.map((k) => (
              <option key={k} value={k}>
                {cat(k)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">{t("filters.sort")}</span>
          <select name="sort" defaultValue={f.sort} className="field">
            {LISTING_SORT_KEYS.map((k) => (
              <option key={k} value={k}>
                {t(`sort.${k}`)}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="btn btn-dark">
          {t("filters.apply")}
        </button>
      </form>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-2" role="status">
          {t("resultCount", { count: data.total })}
          {filtered && (
            <>
              {" · "}
              <Link href="/dashboard/listings" className="font-semibold text-brand hover:underline">
                {t("filters.clear")}
              </Link>
            </>
          )}
        </p>
        <div className="flex gap-1" role="group" aria-label={t("view.label")}>
          <Link href={href({ view: "cards", page: f.page })} aria-current={f.view === "cards" ? "true" : undefined} className="icon-btn aria-[current=true]:bg-ink aria-[current=true]:text-white" aria-label={t("view.cards")}>
            <LayoutGrid className="size-4" aria-hidden />
          </Link>
          <Link href={href({ view: "table", page: f.page })} aria-current={f.view === "table" ? "true" : undefined} className="icon-btn aria-[current=true]:bg-ink aria-[current=true]:text-white" aria-label={t("view.table")}>
            <Rows3 className="size-4" aria-hidden />
          </Link>
        </div>
      </div>

      {data.items.length === 0 ? (
        <div className="mt-6">
          {filtered ? (
            <EmptyState title={t("emptyFilteredTitle")} body={t("emptyFilteredBody")}>
              <Link href="/dashboard/listings" className="btn btn-outline">
                {t("filters.clear")}
              </Link>
            </EmptyState>
          ) : (
            <EmptyState title={t("emptyListingsTitle")} body={kind === "realtor" ? t("emptyListingsRealtor") : t("emptyListingsLandlord")}>
              <Link href="/dashboard/listings/new" className="btn btn-primary">
                {t("addListing")}
              </Link>
            </EmptyState>
          )}
        </div>
      ) : (
        <ListingsBoard
          view={f.view}
          bulk
          canFeature={canFeature}
          items={data.items.map((l) => ({
            id: l.id,
            title: l.title,
            category: cat(l.category),
            status: l.status,
            price: formatAzn(l.monthlyRent, locale),
            area: [l.neighborhood ? nameOf(l.neighborhood, locale) : null, nameOf(l.district, locale)].filter(Boolean).join(", "),
            image: l.image,
            imageCount: l.imageCount,
            rejectionReason: l.rejectionReason,
            createdLabel: formatDate(l.createdAt, locale),
            expiresLabel: l.expiresAt ? formatDate(l.expiresAt, locale) : null,
            featuredUntil: l.featuredUntil?.toISOString() ?? null,
            views: l.views,
            saves: l.saves,
            inquiries: l.inquiries,
            isVerified: l.isVerified,
            availability: l.availability,
            confirmedLabel: l.availabilityConfirmedAt ? formatDate(l.availabilityConfirmedAt, locale) : null,
            needsConfirmation: l.needsConfirmation,
          }))}
        />
      )}
      <Pagination locale={locale} page={data.page} pageCount={data.pageCount} path="/dashboard/listings" query={query({})} />
    </div>
  );
}
