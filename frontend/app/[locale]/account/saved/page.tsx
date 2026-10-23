import { getTranslations, setRequestLocale } from "next-intl/server";
import { Heart } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { requireUser } from "@/server/auth/current";
import { db } from "@/server/db";
import { cardsByIds, publicListingWhere } from "@/server/listings/queries";
import { publicRoommateWhere, roommateCards } from "@/server/roommates/queries";
import { ListingCard } from "@/components/listings/listing-card";
import { RoommateCard } from "@/components/roommates/roommate-card";
import { EmptyState } from "@/components/site/section";

export default async function SavedPage({ params }: { params: Promise<{ locale: AppLocale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireUser(locale);
  const [t, nav] = await Promise.all([getTranslations({ locale, namespace: "account" }), getTranslations({ locale, namespace: "nav" })]);
  // Saved items that are no longer public (rented, expired, removed) are not shown as available.
  const rows = await db.savedListing.findMany({
    where: { userId: user.id, listing: publicListingWhere() },
    orderBy: { createdAt: "desc" },
    select: { listingId: true },
  });
  const [cards, savedAds] = await Promise.all([
    cardsByIds(locale, rows.map((r) => r.listingId)),
    db.savedRoommateAd.findMany({
      where: { userId: user.id, roommateAd: publicRoommateWhere() },
      orderBy: { createdAt: "desc" },
      take: 60,
      select: { roommateAdId: true },
    }),
  ]);
  const order = savedAds.map((r) => r.roommateAdId);
  const people = order.length
    ? (await roommateCards(locale, { id: { in: order } }, order.length)).sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id))
    : [];
  return (
    <div>
      <h1 className="t-h2 mb-6">{t("nav.saved")}</h1>
      {cards.length === 0 ? (
        <EmptyState icon={<Heart className="size-8" aria-hidden />} title={t("emptySavedTitle")} body={t("emptySavedBody")}>
          <Link href="/students" className="btn btn-primary">
            {nav("students")}
          </Link>
        </EmptyState>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((c) => (
            <li key={c.id}>
              <ListingCard listing={c} locale={locale} saved loggedIn />
            </li>
          ))}
        </ul>
      )}
      {people.length > 0 && (
        <section className="mt-12" aria-labelledby="saved-people-h">
          <h2 id="saved-people-h" className="t-h3 mb-4">
            {t("savedRoommates")}
          </h2>
          <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {people.map((ad) => (
              <li key={ad.id}>
                <RoommateCard ad={ad} locale={locale} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
