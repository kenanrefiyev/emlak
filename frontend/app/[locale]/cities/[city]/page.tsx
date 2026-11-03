import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight, UsersRound } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { alternatesFor, openGraphFor } from "@/lib/seo";
import { nameOf } from "@/lib/i18n-data";
import { parseListingFilters } from "@/lib/search/listing-filters";
import { db } from "@/server/db";
import { getCountries, listingInCity, roommateInCity } from "@/server/countries";
import { publicListingWhere } from "@/server/listings/queries";
import { publicRoommateWhere } from "@/server/roommates/queries";
import { ListingSearchPage } from "@/components/listings/listing-search-page";
import { Flag } from "@/components/site/flag";
import { SEGMENTS } from "@/lib/domain";

type Props = { params: Promise<{ locale: AppLocale; city: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

/** A city of an active market, with its country. */
async function findCity(slug: string) {
  const countries = await getCountries();
  for (const country of countries) {
    const city = country.cities.find((c) => c.slug === slug);
    if (city) return { city, country };
  }
  return null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, city: slug } = await params;
  const found = await findCity(slug);
  if (!found) return {};
  const t = await getTranslations({ locale, namespace: "cityPage" });
  const vars = { city: nameOf(found.city, locale), country: nameOf(found.country, locale) };
  return {
    title: t("title", vars),
    description: t("description", vars),
    alternates: alternatesFor(locale, `/cities/${slug}`),
    openGraph: openGraphFor(locale, { title: t("title", vars), description: t("description", vars) }),
  };
}

/**
 * City landing page (/az/seherler/baku, /tr/sehirler/istanbul): the city's
 * student listings with a short intro and a way into its roommate ads.
 * Narrowing the search continues on the main search page, filtered to the city.
 */
export default async function CityPage({ params }: Props) {
  const { locale, city: slug } = await params;
  setRequestLocale(locale);
  const found = await findCity(slug);
  if (!found) notFound();
  const { city, country } = found;
  const [t, listings, roommates] = await Promise.all([
    getTranslations({ locale, namespace: "cityPage" }),
    db.listing.count({ where: { AND: [publicListingWhere(), listingInCity(slug), { category: { in: [...SEGMENTS.students] } }] } }),
    db.roommateAd.count({ where: { AND: [publicRoommateWhere(), roommateInCity(slug)] } }),
  ]);
  const vars = { city: nameOf(city, locale), country: nameOf(country, locale) };
  const filters = { ...parseListingFilters({}, "students"), country: country.code, city: slug };

  return (
    <ListingSearchPage
      locale={locale}
      segment="students"
      filters={filters}
      heading={t("heading", vars)}
      intro={
        <div className="mb-8 flex flex-col gap-4 rounded-2xl bg-mist p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2.5 text-[0.9375rem] text-ink-2">
            <Flag code={country.code} />
            {t("lead", { ...vars, listings, roommates })}
          </p>
          <Link href={`/roommates?country=${country.code}&city=${slug}`} className="btn btn-outline btn-sm shrink-0">
            <UsersRound className="size-4" aria-hidden />
            {t("roommatesLink", vars)}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      }
    />
  );
}
