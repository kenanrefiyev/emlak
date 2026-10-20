import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  Armchair,
  Bath,
  BadgeCheck,
  BedDouble,
  Building,
  CalendarDays,
  Clock,
  Home,
  Info,
  Layers,
  Lock,
  MapPin,
  PlayCircle,
  Receipt,
  Ruler,
  Users,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { getCurrentUser } from "@/server/auth/current";
import { getListingDetail, pickTranslation, similarListings, nearbyListings } from "@/server/listings/queries";
import { savedIdsFor } from "@/server/engagement";
import { nameOf } from "@/lib/i18n-data";
import { formatAzn, formatDate } from "@/lib/format";
import { alternatesFor, siteUrl } from "@/lib/seo";
import { SHARED_CATEGORIES } from "@/lib/domain";
import { Gallery } from "@/components/listings/gallery";
import { ContactPanel } from "@/components/listings/contact-panel";
import { ReportDialog } from "@/components/listings/report-dialog";
import { SaveButton } from "@/components/listings/save-button";
import { ShareButton } from "@/components/listings/share-button";
import { ViewBeacon } from "@/components/listings/view-beacon";
import { ListingCard } from "@/components/listings/listing-card";
import { MetroDot } from "@/components/listings/category-tag";
import { AmenityIcon } from "@/components/listings/amenity-icon";
import { SectionHead } from "@/components/site/section";
import { NearbyMap } from "@/components/listings/nearby-map";

type Props = { params: Promise<{ locale: AppLocale; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  const user = await getCurrentUser();
  const data = await getListingDetail(id, user);
  if (!data) return {};
  const { listing } = data;
  const tr = pickTranslation(listing.translations, locale);
  const [t, cat] = await Promise.all([getTranslations({ locale, namespace: "meta" }), getTranslations({ locale, namespace: "categories" })]);
  const area = [listing.neighborhood ? nameOf(listing.neighborhood, locale) : null, nameOf(listing.district, locale)].filter(Boolean).join(", ");
  const description = tr?.description.slice(0, 155) ?? t("listingFallbackDescription", { category: cat(listing.category), area, price: formatAzn(listing.monthlyRent, locale) });
  const available = listing.translations.map((x) => x.locale as AppLocale);
  // A locale without its own text is a UI-only variant: canonical points to the original language.
  const canonicalLocale = available.includes(locale) ? locale : (listing.originalLocale as AppLocale);
  return {
    title: tr?.title,
    description,
    alternates: alternatesFor(canonicalLocale, `/listings/${id}`, available),
    robots: data.isPublic ? undefined : { index: false, follow: false },
    openGraph: { title: tr?.title, description, type: "article", images: listing.images[0] ? [listing.images[0].url] : undefined },
  };
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="border-t border-line py-10 first:border-t-0 first:pt-0">
      <h2 id={id} className="t-h3 mb-6">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default async function ListingPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const user = await getCurrentUser();
  const data = await getListingDetail(id, user);
  if (!data) notFound();
  const { listing: l, isPublic, canManage } = data;

  const [t, c, e, cat, contactT, langs, nav] = await Promise.all([
    getTranslations({ locale, namespace: "listing" }),
    getTranslations({ locale, namespace: "common" }),
    getTranslations({ locale, namespace: "enums" }),
    getTranslations({ locale, namespace: "categories" }),
    getTranslations({ locale, namespace: "contact" }),
    getTranslations({ locale, namespace: "common.languages" }),
    getTranslations({ locale, namespace: "nav" }),
  ]);
  const tr = pickTranslation(l.translations, locale)!;
  const shared = SHARED_CATEGORIES.includes(l.category);
  const [similar, saved, nearby] = await Promise.all([
    isPublic ? similarListings(locale, l) : Promise.resolve([]),
    savedIdsFor(user?.id, [l.id]),
    nearbyListings(locale, l),
  ]);
  const similarSaved = await savedIdsFor(user?.id, similar.map((s) => s.id));
  const isOwner = user?.id === l.ownerId;
  const byAgent = l.owner.role === "AGENT";
  const agentVerified = l.owner.agentProfile?.verificationStatus === "VERIFIED";
  // Shown only after an admin approved the landlord's documents — never for a phone number alone.
  const landlordVerified = !byAgent && l.owner.profile?.verificationStatus === "VERIFIED";
  const ownerName = byAgent ? (l.owner.agentProfile?.companyName ?? l.owner.name) : (l.owner.name.split(" ")[0] ?? l.owner.name);
  const now = new Date();
  const status = l.status === "PUBLISHED" && l.expiresAt && l.expiresAt <= now ? "EXPIRED" : l.status;
  const segment = l.category === "FAMILY_APARTMENT" ? "family" : "students";
  const place = [
    l.metroStation ? `${nameOf(l.metroStation, locale)} m.` : null,
    l.neighborhood && (!l.metroStation || nameOf(l.neighborhood, locale) !== nameOf(l.metroStation, locale)) ? nameOf(l.neighborhood, locale) : null,
    nameOf(l.district, locale),
  ]
    .filter(Boolean)
    .join(", ");

  const ic = "size-6";
  const overview = [
    { icon: <Home className={ic} strokeWidth={1.5} />, label: t("type"), value: cat(l.category) },
    l.rooms != null ? { icon: <BedDouble className={ic} strokeWidth={1.5} />, label: t("rooms"), value: String(l.rooms) } : null,
    l.bathrooms != null ? { icon: <Bath className={ic} strokeWidth={1.5} />, label: t("bathrooms"), value: String(l.bathrooms) } : null,
    l.areaSqm != null ? { icon: <Ruler className={ic} strokeWidth={1.5} />, label: t("area"), value: c("sqm", { count: l.areaSqm }) } : null,
    l.floor != null && l.totalFloors != null ? { icon: <Layers className={ic} strokeWidth={1.5} />, label: t("floor"), value: `${l.floor}/${l.totalFloors}` } : null,
    shared && l.residentsCount != null ? { icon: <Users className={ic} strokeWidth={1.5} />, label: t("residents"), value: c("people", { count: l.residentsCount }) } : null,
    shared && l.availableSpaces != null ? { icon: <BedDouble className={ic} strokeWidth={1.5} />, label: t("spaces"), value: c("places", { count: l.availableSpaces }) } : null,
    { icon: <Armchair className={ic} strokeWidth={1.5} />, label: t("furnishing"), value: e(`furnishing.${l.furnishing}`) },
    { icon: <CalendarDays className={ic} strokeWidth={1.5} />, label: t("availableFrom"), value: l.availableFrom <= now ? c("availableNow") : formatDate(l.availableFrom, locale) },
    { icon: <Clock className={ic} strokeWidth={1.5} />, label: t("minDuration"), value: c("months", { count: l.minDurationMonths }) },
  ].filter((x) => x !== null);

  const details = [
    { label: t("utilities"), value: e(`utilities.${l.utilities}`) },
    { label: t("internet"), value: l.internet ? t("internetYes") : t("internetNo") },
    { label: t("heating"), value: e(`heating.${l.heating}`) },
    { label: t("airConditioning"), value: l.airConditioning ? c("yes") : c("no") },
    ...(shared ? [{ label: t("gender"), value: e(`gender.${l.genderPreference}`) }] : []),
    { label: t("deposit"), value: l.deposit ? formatAzn(l.deposit, locale) : t("noDeposit") },
    {
      label: t("commission"),
      value:
        l.commissionType === "NONE"
          ? c("noCommission")
          : l.commissionType === "PERCENT"
            ? t("commissionPercent", { value: l.commissionValue ?? 0 })
            : t("commissionFixed", { value: l.commissionValue ?? 0 }),
    },
  ];

  const jsonLd = isPublic
    ? {
        "@context": "https://schema.org",
        "@type": "Accommodation",
        name: tr.title,
        description: tr.description.slice(0, 500),
        url: `${siteUrl()}/${locale}/listings/${l.id}`,
        image: l.images.map((i) => (i.url.startsWith("http") ? i.url : `${siteUrl()}${i.url}`)),
        numberOfRooms: l.rooms ?? undefined,
        floorSize: l.areaSqm ? { "@type": "QuantitativeValue", value: l.areaSqm, unitCode: "MTK" } : undefined,
        address: { "@type": "PostalAddress", addressLocality: "Bakı", addressRegion: nameOf(l.district, "az"), addressCountry: "AZ" },
        offers: { "@type": "Offer", price: l.monthlyRent, priceCurrency: "AZN", availability: "https://schema.org/InStock" },
      }
    : null;

  return (
    <article>
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />}
      {isPublic && !isOwner && <ViewBeacon listingId={l.id} />}

      <div className="shell pt-8 lg:pt-12">
        <nav aria-label={t("breadcrumbs")} className="mb-5 text-sm text-ink-2">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href={`/${segment}`} className="hover:text-brand">
                {segment === "family" ? nav("family") : nav("students")}
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li>
              <Link href={`/${segment}?district=${l.district.slug}`} className="hover:text-brand">
                {nameOf(l.district, locale)}
              </Link>
            </li>
          </ol>
        </nav>

        {!isPublic && (
          <p role="status" className="mb-6 flex items-start gap-2 rounded-xl bg-warn-soft px-4 py-3 text-sm font-medium text-warn">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
            {status === "RENTED" ? t("rentedBanner") : t("previewBanner", { status: e(`listingStatus.${status}`) })}
            {l.rejectionReason && ` — ${l.rejectionReason}`}
          </p>
        )}

        <div className="flex flex-col gap-4 border-b border-line pb-6 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <ul className="mb-3 flex flex-wrap gap-1.5">
              {l.featured.length > 0 && <li className="tag bg-brand text-white">{c("featured")}</li>}
              <li className="tag bg-brand-soft text-brand">{cat(l.category)}</li>
              {l.isVerified && (
                <li className="tag bg-ok-soft text-ok">
                  <BadgeCheck className="size-3.5" aria-hidden />
                  {c("verified")}
                </li>
              )}
              {l.isDemo && (
                <li className="tag bg-gray text-ink-2" title={c("demoHint")}>
                  {c("demo")}
                </li>
              )}
            </ul>
            <h1 className="t-display" lang={tr.locale}>
              {tr.title}
            </h1>
          </div>
          <p className="shrink-0 md:text-right">
            <span className="t-price text-[2rem] leading-none sm:text-[2.5rem]">{formatAzn(l.monthlyRent, locale)}</span>
            <span className="text-lg text-ink-2">{c("perMonth")}</span>
            <span className="block text-sm text-ink-2">{l.pricePerPlace ? c("perPlace") : c("wholeUnit")}</span>
          </p>
        </div>

        <div className="flex flex-col gap-6 py-6 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-6 sm:flex-row sm:gap-14">
            <div>
              <p className="text-base font-semibold">{t("features")}</p>
              <p className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {overview.slice(1, 4).map((o) => (
                  <span key={o.label}>
                    <span className="text-ink-2">{o.label}:</span> <span className="font-semibold">{o.value}</span>
                  </span>
                ))}
              </p>
            </div>
            <div>
              <p className="text-base font-semibold">{t("location")}</p>
              <p className="mt-1.5 flex items-center gap-1.5 text-sm text-ink-2">
                {l.metroStation ? <MetroDot line={l.metroStation.line} /> : <MapPin className="size-4" aria-hidden />}
                {place}
              </p>
            </div>
          </div>
          {isPublic && !isOwner && (
            <div className="flex gap-2.5">
              <SaveButton listingId={l.id} initialSaved={saved.has(l.id)} loggedIn={Boolean(user)} variant="square" />
              <ShareButton title={tr.title} />
              <ReportDialog target={{ listingId: l.id }} loggedIn={Boolean(user)} variant="icon" />
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-[1440px] px-[10px]">
        <Gallery images={l.images} title={tr.title} />
      </div>

      <div className="shell grid gap-10 pt-12 lg:grid-cols-[minmax(0,1fr)_25.5rem] lg:gap-[30px] xl:gap-[60px]">
        <div className="min-w-0">
          <Section id="desc-h" title={t("description")}>
            {tr.locale !== locale && <p className="mb-4 rounded-xl bg-mist px-4 py-2.5 text-sm text-ink-2">{t("translationMissing", { language: langs(locale) })}</p>}
            {tr.isMachine && <p className="mb-4 text-sm text-ink-2">{t("machineTranslated")}</p>}
            <div className="max-w-prose text-[0.9375rem] leading-relaxed whitespace-pre-line text-ink-2" lang={tr.locale}>
              {tr.description}
            </div>
            {tr.paymentTerms && (
              <p className="mt-4 flex items-start gap-2 text-[0.9375rem]">
                <Receipt className="mt-0.5 size-4 shrink-0 text-ink-2" aria-hidden />
                <span>
                  <strong className="font-semibold">{t("paymentTerms")}:</strong> <span className="text-ink-2">{tr.paymentTerms}</span>
                </span>
              </p>
            )}
            {tr.rules && (
              <div className="mt-4 rounded-xl bg-mist px-4 py-3 text-[0.9375rem]">
                <p className="font-semibold">{t("rules")}</p>
                <p className="mt-1 whitespace-pre-line text-ink-2" lang={tr.locale}>
                  {tr.rules}
                </p>
              </div>
            )}
            {l.publishedAt && <p className="mt-4 text-sm text-ink-3">{c("postedOn", { date: formatDate(l.publishedAt, locale) })}</p>}
          </Section>

          <Section id="ov-h" title={t("overview")}>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 xl:grid-cols-4">
              {overview.map((o) => (
                <li key={o.label} className="flex items-center gap-3">
                  <span className="grid size-[3.25rem] shrink-0 place-items-center rounded-lg border border-line" aria-hidden>
                    {o.icon}
                  </span>
                  <span className="min-w-0 text-sm">
                    <span className="block text-ink-2">{o.label}:</span>
                    <span className="block truncate font-semibold">{o.value}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Section>

          <Section id="det-h" title={t("details")}>
            <dl className="grid gap-x-10 gap-y-3 text-[0.9375rem] sm:grid-cols-2">
              {details.map((d) => (
                <div key={d.label} className="flex gap-4">
                  <dt className="w-36 shrink-0 font-semibold">{d.label}</dt>
                  <dd className="text-ink-2">{d.value}</dd>
                </div>
              ))}
            </dl>
          </Section>

          {l.amenities.length > 0 && (
            <Section id="amen-h" title={t("amenities")}>
              <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {l.amenities.map(({ amenity }) => (
                  <li key={amenity.id} className="flex items-center gap-2.5 text-[0.9375rem]">
                    <AmenityIcon name={amenity.icon} className="size-5 text-brand" />
                    {nameOf(amenity, locale)}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <Section id="loc-h" title={t("location")}>
            <dl className="grid gap-x-10 gap-y-3 text-[0.9375rem] sm:grid-cols-2">
              {l.addressPublic && (
                <div className="flex gap-4 sm:col-span-2">
                  <dt className="w-36 shrink-0 font-semibold">{t("address")}</dt>
                  <dd className="text-ink-2">{l.addressPublic}</dd>
                </div>
              )}
              <div className="flex gap-4">
                <dt className="w-36 shrink-0 font-semibold">{t("district")}</dt>
                <dd className="text-ink-2">{nameOf(l.district, locale)}</dd>
              </div>
              {l.neighborhood && (
                <div className="flex gap-4">
                  <dt className="w-36 shrink-0 font-semibold">{t("neighborhood")}</dt>
                  <dd className="text-ink-2">{nameOf(l.neighborhood, locale)}</dd>
                </div>
              )}
              {l.metroStation && (
                <div className="flex gap-4">
                  <dt className="w-36 shrink-0 font-semibold">{t("nearbyMetro")}</dt>
                  <dd className="flex items-center gap-2 text-ink-2">
                    <MetroDot line={l.metroStation.line} />
                    {nameOf(l.metroStation, locale)} ({c(`metroLine.${l.metroStation.line}`)})
                  </dd>
                </div>
              )}
              {l.university && (
                <div className="flex gap-4">
                  <dt className="w-36 shrink-0 font-semibold">{t("nearbyUniversity")}</dt>
                  <dd>
                    <Link href={`/students?uni=${l.university.slug}`} className="text-brand hover:underline">
                      {l.university.shortName} — {nameOf(l.university, locale)}
                    </Link>
                  </dd>
                </div>
              )}
            </dl>
            <p className="mt-5 hint">{t("locationNote")}</p>
            <div className="mt-8">
              <h3 className="mb-1 text-lg font-semibold">{t("nearbyTitle")}</h3>
              <p className="mb-4 text-sm text-ink-2">
                {nearby.points.length ? t("nearbyLead", { count: nearby.points.length }) : t("nearbyEmpty")}
              </p>
              <NearbyMap
                center={nearby.center}
                points={nearby.points.map((p) => ({
                  id: p.id,
                  href: `/${locale}/listings/${p.id}`,
                  title: p.title,
                  price: formatAzn(p.monthlyRent, locale),
                  image: p.image,
                  position: p.position,
                }))}
                labels={{ thisListing: t("nearbyThis"), approxArea: t("nearbyApprox"), open: t("nearbyOpen") }}
              />
              {nearby.points.length > 0 && (
                <ul className="mt-4 grid gap-2 text-[0.9375rem] sm:grid-cols-2">
                  {nearby.points.slice(0, 6).map((p) => (
                    <li key={p.id}>
                      <Link href={`/listings/${p.id}`} className="flex items-baseline justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-mist">
                        <span className="truncate">{p.title}</span>
                        <span className="shrink-0 text-sm text-ink-2">
                          {formatAzn(p.monthlyRent, locale)} · {t("nearbyKm", { km: p.distanceKm < 0.1 ? "<0.1" : p.distanceKm.toFixed(1) })}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {canManage && l.addressPrivate && (
              <p className="mt-2 flex items-center gap-1.5 text-sm text-ink-2">
                <Lock className="size-4" aria-hidden />
                {l.addressPrivate}
              </p>
            )}
          </Section>

          {l.videoUrl && (
            <Section id="video-h" title={t("video")}>
              <a href={l.videoUrl} target="_blank" rel="noopener noreferrer nofollow" className="btn btn-line">
                <PlayCircle className="size-5" aria-hidden />
                {t("videoLink")}
              </a>
            </Section>
          )}
        </div>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-2xl border border-line p-6 sm:p-[30px]">
            <h2 className="t-h3">{t("contactTitle")}</h2>
            <div className="mt-5 flex items-center gap-4">
              <span aria-hidden className="grid size-16 shrink-0 place-items-center rounded-full bg-mist text-2xl font-bold text-brand">
                {byAgent ? <Building className="size-7" strokeWidth={1.6} /> : ownerName.charAt(0).toLocaleUpperCase(locale)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold">{ownerName}</p>
                <p className="flex flex-wrap items-center gap-1.5 text-sm text-ink-2">
                  {byAgent ? c("agent") : l.owner.role === "OWNER" ? c("owner") : c("student")}
                  {agentVerified && (
                    <span className="inline-flex items-center gap-1 text-ok">
                      <BadgeCheck className="size-4" aria-hidden />
                      {c("verifiedAgent")}
                    </span>
                  )}
                  {landlordVerified && (
                    <span className="inline-flex items-center gap-1 text-ok">
                      <BadgeCheck className="size-4" aria-hidden />
                      {t("verifiedLandlord")}
                    </span>
                  )}
                </p>
                <p className="text-sm text-ink-3">{t("memberSince", { date: formatDate(l.owner.createdAt, locale, { day: undefined }) })}</p>
              </div>
            </div>
            {byAgent && (
              <Link href={`/agents/${l.owner.id}`} className="mt-3 inline-flex min-h-10 items-center text-sm font-semibold text-brand hover:underline">
                {t("listingsByAgent")}
              </Link>
            )}
            <div className="mt-5 border-t border-line pt-5">
              {canManage ? (
                <div className="space-y-2">
                  {isOwner && <p className="text-sm text-ink-2">{t("ownListing")}</p>}
                  <Link href={`/dashboard/listings/${l.id}/edit`} className="btn btn-primary w-full">
                    {t("manage")}
                  </Link>
                </div>
              ) : !isPublic ? null : user ? (
                <>
                  <p className="mb-4 text-sm text-ink-2">{t("contactLead")}</p>
                  <ContactPanel target={{ listingId: l.id }} canPhone={byAgent} placeholder={contactT("messagePlaceholder")} />
                </>
              ) : (
                <>
                  <p className="mb-4 text-sm text-ink-2">{t("contactLead")}</p>
                  <Link href={`/login?next=${encodeURIComponent(`/${locale}/listings/${l.id}`)}`} className="btn btn-primary w-full">
                    {t("loginToContact")}
                  </Link>
                </>
              )}
            </div>
            <p className="mt-5 border-t border-line pt-5 text-sm text-ink-2">{l.isVerified ? t("verifiedNote") : t("notVerifiedNote")}</p>
          </div>
        </aside>
      </div>

      {similar.length > 0 && (
        <section className="shell section-y" aria-labelledby="similar-h">
          <SectionHead id="similar-h" subtitle={cat(l.category)} title={t("similar")} />
          <ul className="grid gap-[30px] sm:grid-cols-2 lg:grid-cols-3">
            {similar.slice(0, 3).map((s) => (
              <li key={s.id}>
                <ListingCard listing={s} locale={locale} saved={similarSaved.has(s.id)} loggedIn={Boolean(user)} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
