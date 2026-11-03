import { getTranslations } from "next-intl/server";
import { SearchX, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { SEGMENTS, type Segment } from "@/lib/domain";
import {
  activeListingFilters,
  listingFiltersToQuery,
  withoutFilter,
  type ListingFilterKey,
  type ListingFilters,
} from "@/lib/search/listing-filters";
import { featuredListingCards, searchListings, searchMapPoints } from "@/server/listings/queries";
import { displayPriceText, formatMoney } from "@/lib/money";
import { getMoneyView } from "@/server/money";
import type { LatLng } from "@/lib/baku-geo";
import { getLocationOptions } from "@/server/locations";
import { countryChoices, resolveCountry } from "@/server/countries";
import { getCurrentUser } from "@/server/auth/current";
import { savedIdsFor } from "@/server/engagement";
import { formatShortDate } from "@/lib/format";
import { ListingCard } from "./listing-card";
import { ImpressionBeacon } from "./impression-beacon";
import { FilterForm } from "./filter-form";
import { SearchToolbar } from "./search-toolbar";
import { SaveSearchButton } from "./save-search-button";
import { ResultsMap } from "./results-map";
import { Pagination } from "@/components/site/pagination";
import { EmptyState } from "@/components/site/section";

/**
 * The listing search. City landing pages reuse it with their own heading and
 * intro; refining the search there continues on the main search page.
 */
export async function ListingSearchPage({
  locale,
  segment,
  filters,
  heading,
  intro,
}: {
  locale: AppLocale;
  segment: Segment;
  filters: ListingFilters;
  heading?: string;
  intro?: React.ReactNode;
}) {
  const path = segment === "students" ? "/students" : "/family";
  // Links keep the URL as given; queries always run inside one market.
  const market = await resolveCountry(filters.country);
  const scoped: ListingFilters = { ...filters, country: market.code };
  const [t, c, cat, e, user, options, countries, money] = await Promise.all([
    getTranslations({ locale, namespace: "search" }),
    getTranslations({ locale, namespace: "common" }),
    getTranslations({ locale, namespace: "categories" }),
    getTranslations({ locale, namespace: "enums" }),
    getCurrentUser(),
    getLocationOptions(locale, "slug", market.code),
    countryChoices(locale),
    getMoneyView(),
  ]);
  // A typed price range keeps the currency it was typed in; a new one uses the display currency.
  const priceCurrency = filters.priceCurrency ?? money.display;
  const searchedCity = market.cities.find((c) => c.slug === filters.city) ?? market.cities[0];
  const mapFallback: LatLng = [searchedCity?.latitude ?? market.latitude ?? 0, searchedCity?.longitude ?? market.longitude ?? 0];
  const isMap = filters.view === "map";
  const [result, featured, map] = await Promise.all([
    searchListings(scoped, locale, segment),
    filters.page === 1 && !isMap ? featuredListingCards(locale, 3, segment, market.code) : Promise.resolve([]),
    isMap ? searchMapPoints(scoped, locale, segment) : Promise.resolve(null),
  ]);
  const saved = await savedIdsFor(user?.id, [...result.items, ...featured].map((l) => l.id));
  const query = listingFiltersToQuery({ ...filters, page: 1 });
  const active = activeListingFilters(filters);

  const label = (k: ListingFilterKey): string => {
    const find = (list: { value: string; label: string }[], v?: string) => list.find((o) => o.value === v)?.label ?? v ?? "";
    switch (k) {
      case "q":
        return t("chipQuery", { q: filters.q ?? "" });
      case "categories":
        return filters.categories.map((x) => cat(x)).join(", ");
      case "city":
        return find(options.cities, filters.city);
      case "district":
        return find(options.districts, filters.district);
      case "neighborhood":
        return find(options.neighborhoods, filters.neighborhood);
      case "metro":
        return find(options.metros, filters.metro);
      case "university":
        return options.universities.find((u) => u.value === filters.university)?.short ?? "";
      case "priceMin":
        return t("chipPriceMin", { min: formatMoney(filters.priceMin ?? 0, priceCurrency, locale) });
      case "priceMax":
        return t("chipPriceMax", { max: formatMoney(filters.priceMax ?? 0, priceCurrency, locale) });
      case "rooms":
        return filters.rooms === 4 ? `${t("rooms4")} ${t("rooms").toLocaleLowerCase(locale)}` : t("chipRooms", { count: filters.rooms ?? 0 });
      case "spaces":
        return t("chipSpaces", { count: filters.spaces ?? 0 });
      case "furnishing":
        return e(`furnishing.${filters.furnishing!}`);
      case "utilities":
        return filters.utilities === "included" ? t("utilitiesIncluded") : t("utilitiesExcluded");
      case "available":
        return t("availableOnly");
      case "verifiedOwner":
        return t("verifiedOwner");
      case "moveIn":
        return t("chipMoveIn", { date: formatShortDate(filters.moveIn!, locale) });
      case "duration":
        return t("chipDuration", { count: filters.duration ?? 0 });
      case "verified":
        return t("verified");
      case "postedWithin":
        return t(filters.postedWithin === 1 ? "posted1" : filters.postedWithin === 7 ? "posted7" : "posted30");
      case "gender":
        return e(`gender.${filters.gender!}`);
    }
  };

  return (
    <div className="shell pt-10 pb-4 lg:pt-16">
      <header className="mb-8 flex flex-col gap-5 lg:mb-12 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:gap-6">
          <h1 className="t-display">{heading ?? (segment === "students" ? t("studentsHeading") : t("familyHeading"))}</h1>
          <p className="text-[0.9375rem] text-ink-2" aria-live="polite" id="results-h">
            {t("results", { count: result.total })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Saved with the market so alerts stay in the country it was made in. */}
          <SaveSearchButton kind="LISTINGS" query={listingFiltersToQuery({ ...scoped, page: 1 })} loggedIn={Boolean(user)} />
          <SearchToolbar
            sort={filters.sort}
            view={filters.view}
            sorts={[
              // With a university chosen the default order is distance from the campus.
              { value: "newest", label: filters.university ? t("sortNearest") : t("sortNewest") },
              { value: "price_asc", label: t("sortPriceAsc") },
              { value: "price_desc", label: t("sortPriceDesc") },
            ]}
          />
        </div>
      </header>

      <div className="grid gap-[30px] lg:grid-cols-[25.5rem_1fr]">
        <aside className="lg:sticky lg:top-28 lg:max-h-[calc(100dvh-8rem)] lg:self-start lg:overflow-y-auto">
          <FilterForm
            key={query}
            path={path}
            segment={segment}
            filters={filters}
            categories={SEGMENTS[segment]}
            countries={countries}
            country={market.code}
            priceCurrency={priceCurrency}
            cities={options.cities}
            districts={options.districts}
            neighborhoods={options.neighborhoods}
            metros={options.metros}
            universities={options.universities.map((u) => ({ value: u.value, label: u.label, cityValue: u.cityValue }))}
            showStudentFilters={segment === "students"}
          />
        </aside>

        <section aria-labelledby="results-h" className="min-w-0">
          {intro ?? <p className="mb-5 hint">{segment === "students" ? t("studentsLead") : t("familyLead")}</p>}
          {featured.length > 0 && active.length === 0 && (
            <div className="mb-8">
              <h2 className="mb-3 text-sm font-semibold text-ink-2">{t("featuredTitle")}</h2>
              <ul className="grid gap-[30px]">
                {featured.map((l) => (
                  <li key={l.id}>
                    <ListingCard listing={l} locale={locale} saved={saved.has(l.id)} loggedIn={Boolean(user)} layout="list" />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {active.length > 0 && (
            <div className="mb-5 flex flex-wrap items-center gap-2" aria-label={t("activeFilters")}>
              {active.map((k) => {
                const text = label(k);
                const q = listingFiltersToQuery(withoutFilter(filters, k));
                return (
                  <Link key={k} href={q ? `${path}?${q}` : path} className="chip !min-h-9 !bg-brand-soft !text-brand hover:!bg-brand hover:!text-white" aria-label={t("removeFilter", { label: text })}>
                    {text}
                    <X className="size-3.5" aria-hidden />
                  </Link>
                );
              })}
              <Link href={filters.sort !== "newest" ? `${path}?sort=${filters.sort}` : path} className="inline-flex min-h-8 items-center px-2 text-sm font-semibold text-brand hover:underline">
                {c("clearAll")}
              </Link>
            </div>
          )}

          {map && result.total > 0 && (
            <div className="mb-8">
              <ResultsMap
                center={map.center}
                fallback={mapFallback}
                points={map.points.map((p) => ({ id: p.id, href: `/${locale}/listings/${p.id}`, title: p.title, price: displayPriceText(p.monthlyRent, p.currency, money, locale), image: p.image, position: p.position }))}
                labels={{ open: t("mapOpen"), university: options.universities.find((u) => u.value === filters.university)?.short ?? "" }}
              />
              <p className="mt-3 hint">
                {t("mapNote")}
                {map.capped && ` ${t("mapCapped", { count: map.points.length })}`}
              </p>
            </div>
          )}

          {result.items.length === 0 ? (
            <EmptyState icon={<SearchX className="size-8" aria-hidden />} title={t("emptyTitle")} body={t("emptyBody")}>
              {active.length > 0 && (
                <Link href={path} className="btn btn-outline">
                  {c("clearAll")}
                </Link>
              )}
            </EmptyState>
          ) : (
            <ul className={filters.view === "grid" ? "grid gap-[30px] sm:grid-cols-2" : "grid gap-[30px]"}>
              {result.items.map((l, i) => (
                <li key={l.id}>
                  <ListingCard listing={l} locale={locale} saved={saved.has(l.id)} loggedIn={Boolean(user)} layout={filters.view === "grid" ? "grid" : "list"} priority={i < 2} />
                </li>
              ))}
            </ul>
          )}
          <ImpressionBeacon listingIds={result.items.map((l) => l.id)} />
          <p className="mt-6 hint">{t("perPlaceNote")}</p>
          <Pagination locale={locale} page={result.page} pageCount={result.pageCount} path={path} query={listingFiltersToQuery({ ...filters, page: 1 })} />
        </section>
      </div>
    </div>
  );
}
