import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { nameOf, nameSelect } from "@/lib/i18n-data";
import { COUNTRY_COOKIE } from "@/lib/market";
import type { AppLocale } from "@/i18n/routing";

/** Active markets with their cities, in display order. */
export const getCountries = cache(async () => {
  const rows = await db.country.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
    select: {
      id: true,
      code: true,
      currency: true,
      latitude: true,
      longitude: true,
      ...nameSelect,
      cities: {
        orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }],
        select: { id: true, slug: true, isPopular: true, latitude: true, longitude: true, ...nameSelect },
      },
    },
  });
  if (!rows.length) throw new Error("No active country — run migrations / seed");
  return rows;
});

export type Market = Awaited<ReturnType<typeof getCountries>>[number];

/** The market chosen in the header (cookie), else the first active country. */
export const getCurrentCountry = cache(async (): Promise<Market> => {
  const countries = await getCountries();
  const code = (await cookies()).get(COUNTRY_COOKIE)?.value;
  return countries.find((c) => c.code === code) ?? countries[0]!;
});

/** An explicit country (from a URL) wins over the visitor's saved market when it exists. */
export async function resolveCountry(explicit?: string): Promise<Market> {
  const found = explicit ? (await getCountries()).find((c) => c.code === explicit) : undefined;
  return found ?? getCurrentCountry();
}

/** Countries for the selector, names in the interface language. */
export async function countryChoices(locale: AppLocale) {
  return (await getCountries()).map((c) => ({ code: c.code, name: nameOf(c, locale), currency: c.currency, latitude: c.latitude, longitude: c.longitude }));
}

export const listingInCountry = (code: string): Prisma.ListingWhereInput => ({ district: { city: { country: { code } } } });
export const roommateInCountry = (code: string): Prisma.RoommateAdWhereInput => ({ city: { country: { code } } });
export const listingInCity = (slug: string): Prisma.ListingWhereInput => ({ district: { city: { slug } } });
export const roommateInCity = (slug: string): Prisma.RoommateAdWhereInput => ({ city: { slug } });
