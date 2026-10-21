import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight, BadgeCheck, Building2, KeyRound, LockKeyhole, ShieldCheck, UsersRound } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { alternatesFor } from "@/lib/seo";
import { getCurrentUser } from "@/server/auth/current";
import { getLocationOptions } from "@/server/locations";
import { listingCards } from "@/server/listings/queries";
import { roommateCards } from "@/server/roommates/queries";
import { districtsWithCounts, universitiesWithCounts } from "@/server/home";
import { savedIdsFor } from "@/server/engagement";
import { ListingCard } from "@/components/listings/listing-card";
import { RoommateCard } from "@/components/roommates/roommate-card";
import { HeroSearch } from "@/components/site/hero-search";
import { EmptyState, SectionHead } from "@/components/site/section";
import { MetroDot } from "@/components/listings/category-tag";
import { DISTRICT_PHOTOS, HERO_PHOTO, SAFETY_PHOTO } from "@/lib/area-photos";
import { SEGMENTS, type ListingCategory } from "@/lib/domain";
import { formatAzn } from "@/lib/format";

const AFFORDABLE_MAX = 250;
const AREA_DISTRICTS = ["yasamal", "nesimi", "nerimanov", "sebail", "xetai", "nizami"];

type Props = { params: Promise<{ locale: AppLocale }>; searchParams: Promise<{ cat?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    title: { absolute: t("homeTitle") },
    description: t("homeDescription"),
    alternates: alternatesFor(locale, "/"),
    openGraph: { title: t("homeTitle"), description: t("homeDescription"), images: [HERO_PHOTO.src] },
  };
}

export default async function HomePage({ params, searchParams }: Props) {
  const { locale } = await params;
  // The page renders alongside the layout, so it must reject non-locales
  // (e.g. a browser asking for /favicon.ico) itself.
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const { cat: catParam } = await searchParams;
  const activeCat = SEGMENTS.students.find((c) => c.toLowerCase() === catParam) as ListingCategory | undefined;

  const [t, nav, cat, user, options, districts, unis] = await Promise.all([
    getTranslations({ locale, namespace: "home" }),
    getTranslations({ locale, namespace: "nav" }),
    getTranslations({ locale, namespace: "categories" }),
    getCurrentUser(),
    getLocationOptions(locale, "slug"),
    districtsWithCounts(locale, AREA_DISTRICTS),
    universitiesWithCounts(locale),
  ]);
  const [recent, family, roommates] = await Promise.all([
    listingCards(locale, { category: activeCat ? activeCat : { in: [...SEGMENTS.students] } }, 6),
    listingCards(locale, { category: "FAMILY_APARTMENT" }, 3),
    roommateCards(locale, {}, 6),
  ]);
  // Cheapest places not already shown in the first grid.
  const affordable = await listingCards(
    locale,
    { id: { notIn: recent.map((l) => l.id) }, category: { in: ["PRIVATE_ROOM", "DORMITORY", "SHARED_APARTMENT"] }, pricePerPlace: true, monthlyRent: { lte: AFFORDABLE_MAX } },
    3,
    [{ monthlyRent: "asc" }],
  );
  const saved = await savedIdsFor(user?.id, [...recent, ...affordable, ...family].map((l) => l.id));
  const cards = (list: typeof recent, priority = false) => (
    <ul className="grid gap-[30px] sm:grid-cols-2 lg:grid-cols-3">
      {list.map((l, i) => (
        <li key={l.id}>
          <ListingCard listing={l} locale={locale} saved={saved.has(l.id)} loggedIn={Boolean(user)} priority={priority && i < 3} />
        </li>
      ))}
    </ul>
  );
  const how = [
    { key: "room" as const, href: "/students", icon: <KeyRound className="size-12" strokeWidth={1.3} aria-hidden /> },
    { key: "mate" as const, href: "/roommates", icon: <UsersRound className="size-12" strokeWidth={1.3} aria-hidden /> },
    { key: "post" as const, href: "/post", icon: <Building2 className="size-12" strokeWidth={1.3} aria-hidden /> },
  ];
  const safety = [
    { key: "moderation" as const, icon: <ShieldCheck className="size-9" strokeWidth={1.4} aria-hidden /> },
    { key: "verified" as const, icon: <BadgeCheck className="size-9" strokeWidth={1.4} aria-hidden /> },
    { key: "privacy" as const, icon: <LockKeyhole className="size-9" strokeWidth={1.4} aria-hidden /> },
  ];

  return (
    <>
      {/* Hero — full-bleed photo, centered headline, tabbed pill search */}
      <section className="relative isolate overflow-hidden">
        <Image src={HERO_PHOTO.src} alt={t("heroPhotoAlt")} fill priority quality={85} sizes="100vw" className="-z-20 object-cover object-[center_55%]" />
        <div className="absolute inset-0 -z-10 bg-[#161e2d]/45" aria-hidden />
        <div className="shell pt-20 pb-16 text-center sm:pt-28 lg:pt-36 lg:pb-32">
          <h1 className="t-hero mx-auto max-w-5xl text-white">{t("title")}</h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-white/90">{t("lead")}</p>
          <div className="mx-auto mt-10 max-w-[1290px] lg:mt-16">
            <HeroSearch districts={options.districts} universities={options.universities.map((u) => ({ value: u.value, label: u.short }))} />
          </div>
        </div>
      </section>

      {/* Recent student listings with category pills */}
      <section className="shell section-y" aria-labelledby="recent-h">
        <SectionHead id="recent-h" subtitle={t("recentSubtitle")} title={t("recentTitle")} />
        <ul className="mb-10 flex flex-wrap justify-center gap-2.5" aria-label={t("searchType")}>
          {[undefined, ...SEGMENTS.students].map((k) => (
            <li key={k ?? "all"}>
              <Link
                href={k ? `/?cat=${k.toLowerCase()}#recent-h` : "/#recent-h"}
                scroll={false}
                aria-current={activeCat === k ? "true" : undefined}
                className="chip hover:bg-brand-soft aria-[current=true]:bg-brand aria-[current=true]:text-white"
              >
                {k ? cat(k) : t("allCategories")}
              </Link>
            </li>
          ))}
        </ul>
        {recent.length ? cards(recent, true) : <EmptyState title={t("emptySection")} />}
        <div className="mt-12 text-center">
          <Link href={activeCat ? `/students?type=${activeCat.toLowerCase()}` : "/students"} className="btn btn-primary">
            {t("viewAll")}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </section>

      {/* Districts — tall photo cards with an inner white card */}
      <section className="pb-[60px] lg:pb-[100px]" aria-labelledby="areas-h">
        <div className="shell">
          <SectionHead id="areas-h" subtitle={t("areasSubtitle")} title={t("areasTitle")} />
        </div>
        <ul className="mx-auto flex max-w-[1440px] snap-x gap-2 overflow-x-auto px-[10px] pb-2 lg:grid lg:grid-cols-6 lg:overflow-visible">
          {districts.map((d) => {
            const photo = DISTRICT_PHOTOS[d.slug];
            return (
              <li key={d.slug} className="w-[15rem] shrink-0 snap-start lg:w-auto">
                <Link href={`/students?district=${d.slug}`} className="group relative block aspect-[4/5] overflow-hidden rounded-2xl bg-gray">
                  {photo && (
                    <Image
                      src={photo.src}
                      alt={locale === "az" ? photo.alt.az : photo.alt.en}
                      fill
                      sizes="(min-width: 1024px) 230px, 240px"
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  )}
                  <span className="absolute inset-x-2 bottom-2 flex items-center justify-between gap-2 rounded-xl bg-paper p-4">
                    <span className="min-w-0">
                      <span className="block text-sm text-ink">{t("areaListings", { count: d.count })}</span>
                      <span className="block truncate text-lg font-semibold">{d.name}</span>
                    </span>
                    <span className="grid size-11 shrink-0 place-items-center rounded-full border border-line transition-colors group-hover:border-brand group-hover:bg-brand group-hover:text-white">
                      <ArrowRight className="size-5" aria-hidden />
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* How it works — three service boxes */}
      <section className="shell pb-[60px] lg:pb-[100px]" aria-labelledby="how-h">
        <SectionHead id="how-h" subtitle={t("howSubtitle")} title={t("howTitle")} />
        <ul className="grid gap-[30px] md:grid-cols-3">
          {how.map((b) => (
            <li key={b.key} className="flex flex-col items-center rounded-2xl border border-line px-8 py-10 text-center">
              <span className="text-brand">{b.icon}</span>
              <h3 className="mt-6 text-xl font-semibold">{t(`howBoxes.${b.key}.title`)}</h3>
              <p className="mt-3 text-[0.9375rem] text-ink-2">{t(`howBoxes.${b.key}.body`)}</p>
              <Link href={b.href} className="btn btn-line mt-7 !px-8">
                {t(`howBoxes.${b.key}.cta`)}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Safety — soft block, photo left, items right */}
      <section className="mx-[5px] rounded-[30px] bg-mist" aria-labelledby="safety-h">
        <div className="shell grid items-center gap-10 section-y lg:grid-cols-2 lg:gap-16">
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl lg:aspect-[5/6]">
            <Image src={SAFETY_PHOTO.src} alt="" fill quality={85} sizes="(min-width: 1024px) 640px, 100vw" className="object-cover" />
          </div>
          <div>
            <SectionHead id="safety-h" align="left" subtitle={t("safetySubtitle")} title={t("safetyTitle")} lead={t("safetyLead")} />
            <ul className="space-y-5">
              {safety.map((s) => (
                <li key={s.key} className="flex gap-6 rounded-2xl bg-paper p-6 sm:p-8">
                  <span className="shrink-0 text-brand">{s.icon}</span>
                  <span>
                    <span className="block text-lg font-semibold">{t(`safetyItems.${s.key}.title`)}</span>
                    <span className="mt-1.5 block text-[0.9375rem] text-ink-2">{t(`safetyItems.${s.key}.body`)}</span>
                  </span>
                </li>
              ))}
            </ul>
            <Link href="/safety" className="btn btn-line mt-8">
              {t("safetyLink")}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      {/* Affordable rooms */}
      <section className="shell section-y" aria-labelledby="cheap-h">
        <SectionHead
          id="cheap-h"
          subtitle={t("affordableSubtitle")}
          title={t("affordableTitle")}
          lead={t("affordableLead", { price: formatAzn(AFFORDABLE_MAX, locale) })}
        />
        {affordable.length ? cards(affordable) : <EmptyState title={t("emptySection")} />}
      </section>

      {/* Roommates — photo + ad cards on the soft background */}
      <section className="bg-mist section-y" aria-labelledby="mates-h">
        <div className="shell">
          <SectionHead id="mates-h" subtitle={t("roommatesSubtitle")} title={t("roommatesTitle")} lead={t("roommatesLead")} />
          <div>
            {roommates.length ? (
              <ul className="grid gap-[30px] sm:grid-cols-2 lg:grid-cols-3">
                {roommates.map((r) => (
                  <li key={r.id}>
                    <RoommateCard ad={r} locale={locale} />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title={t("emptySection")} />
            )}
          </div>
          <div className="mt-12 flex flex-wrap justify-center gap-3">
            <Link href="/roommates" className="btn btn-primary">
              {t("roommatesButton")}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link href="/roommates/new" className="btn btn-outline">
              {t("ctaStudentButton")}
            </Link>
          </div>
        </div>
      </section>

      {/* Universities */}
      <section className="shell section-y" aria-labelledby="unis-h">
        <SectionHead id="unis-h" subtitle={t("unisSubtitle")} title={t("unisTitle")} lead={t("unisLead")} />
        <ul className="grid gap-[30px] sm:grid-cols-2 lg:grid-cols-4">
          {unis.map((u) => (
            <li key={u.slug}>
              <Link href={`/students?uni=${u.slug}`} className="group flex h-full flex-col rounded-2xl border border-line p-6 transition-colors hover:border-brand">
                <span className="text-xl font-bold group-hover:text-brand">{u.short}</span>
                <span className="mt-1 text-sm text-ink-2">{u.name}</span>
                <span className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-4 text-sm">
                  <span className="flex min-w-0 items-center gap-1.5 text-ink-2">
                    {u.metro ? <MetroDot line={u.metro.line} /> : null}
                    <span className="truncate">{u.metro?.name ?? u.district ?? ""}</span>
                  </span>
                  <span className="shrink-0 font-semibold">{t("uniListings", { count: u.count })}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Family */}
      <section className="shell pb-[60px] lg:pb-[100px]" aria-labelledby="family-h">
        <SectionHead id="family-h" subtitle={t("familySubtitle")} title={t("familyTitle")} />
        {family.length ? cards(family) : <EmptyState title={t("emptySection")} />}
        <div className="mt-12 text-center">
          <Link href="/family" className="btn btn-primary">
            {nav("family")}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </section>

      {/* Agents / owners */}
      <section className="shell pb-[60px] lg:pb-[100px]" aria-labelledby="agent-h">
        <div className="flex flex-col gap-6 rounded-[30px] bg-mist p-8 sm:p-12 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <h2 id="agent-h" className="t-h2">
              {t("agentCtaTitle")}
            </h2>
            <p className="mt-3 text-ink-2">{t("agentCtaBody")}</p>
          </div>
          <Link href="/post" className="btn btn-primary shrink-0">
            {t("agentCtaButton")}
          </Link>
        </div>
      </section>
    </>
  );
}
