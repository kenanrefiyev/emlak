import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";
import { parseListingFilters } from "@/lib/search/listing-filters";
import { alternatesFor } from "@/lib/seo";
import { ListingSearchPage } from "@/components/listings/listing-search-page";

type Props = { params: Promise<{ locale: AppLocale }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  const filtered = Object.keys(await searchParams).length > 0;
  return {
    title: t("studentsTitle"),
    description: t("studentsDescription"),
    alternates: alternatesFor(locale, "/students"),
    // Filtered permutations are not indexed; the canonical points at the base page.
    robots: filtered ? { index: false, follow: true } : undefined,
  };
}

export default async function StudentsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const filters = parseListingFilters(await searchParams, "students");
  return <ListingSearchPage locale={locale} segment="students" filters={filters} />;
}
