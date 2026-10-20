import { getTranslations, setRequestLocale } from "next-intl/server";
import { Heart } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { requireUser } from "@/server/auth/current";
import { db } from "@/server/db";
import { cardsByIds, publicListingWhere } from "@/server/listings/queries";
import { ListingCard } from "@/components/listings/listing-card";
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
  const cards = await cardsByIds(locale, rows.map((r) => r.listingId));
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
    </div>
  );
}
