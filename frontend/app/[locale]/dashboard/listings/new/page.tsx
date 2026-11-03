import { getTranslations, setRequestLocale } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";
import { requireUser } from "@/server/auth/current";
import { getLocationOptions } from "@/server/locations";
import { countryChoices, getCurrentCountry } from "@/server/countries";
import { displayCurrencies } from "@/server/money";
import { getSettings } from "@/server/settings";
import { db } from "@/server/db";
import { isoDay } from "@/lib/format";
import { ListingWizard } from "@/components/dashboard/listing-wizard";

export default async function NewListingPage({ params }: { params: Promise<{ locale: AppLocale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireUser(locale, `/${locale}/dashboard/listings/new`);
  // New listings start in the visitor's selected market.
  const market = await getCurrentCountry();
  const [t, options, settings, account, currencies, countries] = await Promise.all([
    getTranslations({ locale, namespace: "dashboard" }),
    // Every market's places: the owner picks the country in the form.
    getLocationOptions(locale, "id"),
    getSettings(),
    db.user.findUnique({ where: { id: user.id }, select: { phone: true, agentProfile: { select: { businessPhone: true } } } }),
    displayCurrencies(),
    countryChoices(locale),
  ]);
  const isAgent = user.role === "AGENT";
  return (
    <div className="max-w-4xl">
      <h1 className="t-h2">{t("wizard.titleNew")}</h1>
      <p className="mt-1 mb-6 text-ink-2">{t("wizard.leadNew")}</p>
      <ListingWizard
        options={options}
        currencies={currencies}
        countries={countries}
        defaultCountry={market.code}
        ttlDays={settings.listingTtlDays}
        isAgent={isAgent}
        values={{
          category: isAgent || user.role === "OWNER" ? "ENTIRE_APARTMENT" : "PRIVATE_ROOM",
          propertyType: "APARTMENT",
          title: "",
          description: "",
          paymentTerms: "",
          rules: "",
          originalLocale: locale,
          // The market's currency by default; the owner can pick another market's.
          currency: market.currency,
          monthlyRent: "",
          pricePerPlace: true,
          deposit: null,
          commissionType: isAgent ? "PERCENT" : "NONE",
          commissionValue: null,
          utilitiesCost: null,
          internetCost: null,
          otherCosts: null,
          otherCostsNote: null,
          costSharers: null,
          districtId: "",
          neighborhoodId: null,
          metroStationId: null,
          universityId: null,
          addressPrivate: null,
          addressPublic: null,
          rooms: null,
          bathrooms: null,
          areaSqm: null,
          floor: null,
          totalFloors: null,
          residentsCount: null,
          availableSpaces: 1,
          furnishing: "FURNISHED",
          utilities: "NOT_INCLUDED",
          internet: true,
          heating: "CENTRAL",
          airConditioning: false,
          genderPreference: "ANY",
          availableFrom: isoDay(new Date()),
          minDurationMonths: 6,
          videoUrl: null,
          amenityIds: [],
          contactName: user.name,
          contactPhone: (isAgent ? account?.agentProfile?.businessPhone : null) ?? account?.phone ?? null,
          contactWhatsapp: false,
          contactPreference: "IN_APP",
        }}
      />
    </div>
  );
}
