import type { MetadataRoute } from "next";
import { locales } from "@/i18n/routing";
import { siteUrl } from "@/lib/seo";
import { db } from "@/server/db";
import { publicListingWhere } from "@/server/listings/queries";
import { publicRoommateWhere } from "@/server/roommates/queries";

export const dynamic = "force-dynamic";

const STATIC = ["", "/students", "/family", "/roommates", "/areas", "/post", "/help", "/safety", "/privacy", "/terms", "/contact"];

function entry(path: string, available: readonly string[] = locales, lastModified?: Date): MetadataRoute.Sitemap {
  const languages = Object.fromEntries(available.map((l) => [l, `${siteUrl()}/${l}${path}`]));
  return available.map((l) => ({ url: `${siteUrl()}/${l}${path}`, lastModified, alternates: { languages } }));
}

/** Only public, published content. Listings advertise the languages they actually have text in. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [listings, roommates, agents] = await Promise.all([
    db.listing.findMany({ where: publicListingWhere(), select: { id: true, updatedAt: true, translations: { select: { locale: true } } }, take: 5000 }),
    db.roommateAd.findMany({ where: publicRoommateWhere(), select: { id: true, updatedAt: true, originalLocale: true }, take: 5000 }),
    db.user.findMany({ where: { role: "AGENT", status: "ACTIVE", listings: { some: publicListingWhere() } }, select: { id: true } }),
  ]);
  return [
    ...STATIC.flatMap((p) => entry(p)),
    ...listings.flatMap((l) => entry(`/listings/${l.id}`, l.translations.map((t) => t.locale), l.updatedAt)),
    ...roommates.flatMap((r) => entry(`/roommates/${r.id}`, [r.originalLocale], r.updatedAt)),
    ...agents.flatMap((a) => entry(`/agents/${a.id}`)),
  ];
}
