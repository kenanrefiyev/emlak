import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { requireUser } from "@/server/auth/current";
import { getLocationOptions } from "@/server/locations";
import { getSettings } from "@/server/settings";
import { db } from "@/server/db";
import { ownerStatusOf } from "@/server/dashboard";
import { isoDay } from "@/lib/format";
import { ListingWizard } from "@/components/dashboard/listing-wizard";
import { displayCurrencies } from "@/server/money";
import { countryChoices } from "@/server/countries";
import { ListingStatusBadge } from "@/components/dashboard/lead-badge";

const STEPS = ["basics", "location", "details", "conditions", "photos", "contact", "review"] as const;
type Props = { params: Promise<{ locale: AppLocale; id: string }>; searchParams: Promise<{ step?: string; created?: string }> };

export default async function EditListingPage({ params, searchParams }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const user = await requireUser(locale);
  if (!/^[a-z0-9]{10,40}$/.test(id)) notFound();
  const listing = await db.listing.findUnique({
    where: { id },
    include: {
      translations: true,
      images: { orderBy: { position: "asc" } },
      amenities: true,
      district: { select: { city: { select: { country: { select: { code: true } } } } } },
    },
  });
  // Another user's listing looks exactly like a missing one.
  if (!listing || (listing.ownerId !== user.id && user.role !== "ADMIN")) notFound();
  const sp = await searchParams;
  const step = (STEPS as readonly string[]).includes(sp.step ?? "") ? (sp.step as (typeof STEPS)[number]) : "basics";
  const [t, options, settings, currencies, countries] = await Promise.all([
    getTranslations({ locale, namespace: "dashboard" }),
    getLocationOptions(locale, "id"),
    getSettings(),
    displayCurrencies(),
    countryChoices(locale),
  ]);
  const original = listing.translations.find((x) => x.isOriginal) ?? listing.translations[0];
  const status = ownerStatusOf(listing);

  return (
    <div className="max-w-4xl">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="t-h2">{t("wizard.titleEdit")}</h1>
        <ListingStatusBadge status={status} />
      </div>
      <p className="mt-1 mb-6 line-clamp-1 text-ink-2">{original?.title}</p>
      <ListingWizard
        listingId={listing.id}
        currencies={currencies}
        countries={countries}
        defaultCountry={listing.district.city.country.code}
        initialStep={step}
        justCreated={sp.created === "1"}
        status={status}
        canSubmit={listing.status === "DRAFT" || listing.status === "REJECTED"}
        rejectionReason={listing.status === "REJECTED" ? listing.rejectionReason : null}
        options={options}
        ttlDays={settings.listingTtlDays}
        isAgent={user.role === "AGENT"}
        images={listing.images.map((i) => ({ id: i.id, url: i.url, width: i.width, height: i.height }))}
        translations={listing.translations.filter((x) => !x.isOriginal).map((x) => ({ locale: x.locale, title: x.title, description: x.description, paymentTerms: x.paymentTerms }))}
        values={{
          ...listing,
          title: original?.title ?? "",
          description: original?.description ?? "",
          paymentTerms: original?.paymentTerms ?? "",
          rules: original?.rules ?? "",
          availableFrom: isoDay(listing.availableFrom),
          amenityIds: listing.amenities.map((x) => x.amenityId),
        }}
      />
      <p className="mt-10">
        <Link href="/dashboard/listings" className="text-sm font-semibold text-brand hover:underline">
          ← {t("backToListings")}
        </Link>
      </p>
    </div>
  );
}
