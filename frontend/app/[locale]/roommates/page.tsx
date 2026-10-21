import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Plus, UsersRound } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { parseRoommateFilters, roommateFiltersToQuery } from "@/lib/search/roommate-filters";
import { alternatesFor } from "@/lib/seo";
import { getCurrentUser } from "@/server/auth/current";
import { getLocationOptions } from "@/server/locations";
import { searchRoommates } from "@/server/roommates/queries";
import { RoommateCard } from "@/components/roommates/roommate-card";
import { RoommateFilterForm } from "@/components/roommates/roommate-filter-form";
import { SearchToolbar } from "@/components/listings/search-toolbar";
import { SaveSearchButton } from "@/components/listings/save-search-button";
import { Pagination } from "@/components/site/pagination";
import { EmptyState } from "@/components/site/section";

type Props = { params: Promise<{ locale: AppLocale }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  const filtered = Object.keys(await searchParams).length > 0;
  return {
    title: t("roommatesTitle"),
    description: t("roommatesDescription"),
    alternates: alternatesFor(locale, "/roommates"),
    robots: filtered ? { index: false, follow: true } : undefined,
  };
}

export default async function RoommatesPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const filters = parseRoommateFilters(await searchParams);
  const [t, s, user, options] = await Promise.all([
    getTranslations({ locale, namespace: "roommates" }),
    getTranslations({ locale, namespace: "search" }),
    getCurrentUser(),
    getLocationOptions(locale, "slug"),
  ]);
  const result = await searchRoommates(filters, locale, user?.id);
  const query = roommateFiltersToQuery({ ...filters, page: 1 });

  return (
    <div className="shell pt-10 lg:pt-16">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-3xl">
                    <h1 className="t-display">{t("heading")}</h1>
          <p className="mt-2 text-ink-2">{t("lead")}</p>
        </div>
        <Link href="/roommates/new" className="btn btn-primary">
          <Plus className="size-4" aria-hidden />
          {t("create")}
        </Link>
      </header>

      <RoommateFilterForm
        key={query}
        filters={filters}
        districts={options.districts}
        universities={options.universities.map((u) => ({ value: u.value, label: u.short }))}
      />

      <div className="mt-6 mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <h2 className="text-base font-semibold" aria-live="polite">
          {t("results", { count: result.total })}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <SaveSearchButton kind="ROOMMATES" query={query} loggedIn={Boolean(user)} />
          <SearchToolbar
            showView={false}
            sort={filters.sort}
            sorts={[
              { value: "newest", label: s("sortNewest") },
              { value: "price_asc", label: s("sortPriceAsc") },
              ...(result.hasReference ? [{ value: "match", label: s("sortMatch") }] : []),
            ]}
          />
        </div>
      </div>

      <p className="mb-8 rounded-xl bg-mist px-5 py-4 text-sm text-ink-2">
        {result.hasReference ? t("matchExplain") : t("matchNeedAd")} {t("matchDisclaimer")}{" "}
        <Link href="/help#matching" className="font-semibold text-brand underline">
          {t("matchHowLink")}
        </Link>
      </p>

      {result.items.length === 0 ? (
        <EmptyState icon={<UsersRound className="size-8" aria-hidden />} title={t("emptyTitle")} body={t("emptyBody")}>
          <Link href="/roommates/new" className="btn btn-dark">
            {t("create")}
          </Link>
        </EmptyState>
      ) : (
        <ul className="grid gap-[30px] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {result.items.map((ad) => (
            <li key={ad.id}>
              <RoommateCard ad={ad} locale={locale} />
            </li>
          ))}
        </ul>
      )}
      <Pagination locale={locale} page={result.page} pageCount={result.pageCount} path="/roommates" query={query} />
    </div>
  );
}
