import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CalendarDays, Check, Info, MapPin } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { getCurrentUser } from "@/server/auth/current";
import { getRoommateDetail, viewerReferenceAd } from "@/server/roommates/queries";
import { matchAds } from "@/lib/matching";
import { nameOf } from "@/lib/i18n-data";
import { formatAzn, formatDate } from "@/lib/format";
import { alternatesFor } from "@/lib/seo";
import { isRoommateSaved } from "@/server/engagement";
import { ContactPanel } from "@/components/listings/contact-panel";
import { SaveRoommateButton } from "@/components/roommates/save-roommate-button";
import { ReportDialog } from "@/components/listings/report-dialog";
import { MetroDot } from "@/components/listings/category-tag";

type Props = { params: Promise<{ locale: AppLocale; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const data = await getRoommateDetail(id, await getCurrentUser());
  if (!data) return {};
  return {
    title: data.ad.title,
    description: data.ad.description.slice(0, 155),
    // User-written text exists only in its original language, which is the canonical version.
    alternates: alternatesFor(data.ad.originalLocale as AppLocale, `/roommates/${id}`, [data.ad.originalLocale as AppLocale]),
    robots: data.isPublic ? undefined : { index: false, follow: false },
  };
}

export default async function RoommateDetailPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const user = await getCurrentUser();
  const data = await getRoommateDetail(id, user);
  if (!data) notFound();
  const { ad, isPublic, canManage } = data;
  const [t, c, e, cat, langs, contactT] = await Promise.all([
    getTranslations({ locale, namespace: "roommates" }),
    getTranslations({ locale, namespace: "common" }),
    getTranslations({ locale, namespace: "enums" }),
    getTranslations({ locale, namespace: "categories" }),
    getTranslations({ locale, namespace: "common.languages" }),
    getTranslations({ locale, namespace: "contact" }),
  ]);
  const isOwner = user?.id === ad.ownerId;
  const hasPlace = ad.type === "HAS_PLACE";
  const reference = !isOwner ? await viewerReferenceAd(user?.id) : null;
  const match = reference
    ? matchAds(reference, {
        id: ad.id,
        type: ad.type,
        monthlyContribution: ad.monthlyContribution,
        budgetMin: ad.budgetMin,
        budgetMax: ad.budgetMax,
        districtId: ad.districtId,
        preferredDistrictIds: ad.preferredDistricts.map((p) => p.districtId),
        moveInDate: ad.moveInDate,
        durationMonths: ad.durationMonths,
        accommodationType: ad.accommodationType,
        desiredPropertyType: ad.desiredPropertyType,
        availableSpaces: ad.availableSpaces,
        groupSize: ad.groupSize,
        smoking: ad.smoking,
        sleepSchedule: ad.sleepSchedule,
        cleaning: ad.cleaning,
        noise: ad.noise,
      })
    : null;
  const saved = !isOwner && isPublic ? await isRoommateSaved(user?.id, ad.id) : false;
  // The author decides whether their profile details appear on the ad; the owner and admins always see them.
  const showProfile = ad.showProfile || canManage;
  const status = ad.status === "PUBLISHED" && ad.expiresAt && ad.expiresAt <= new Date() ? "EXPIRED" : ad.status;

  const rows = [
    hasPlace && ad.monthlyContribution != null ? { label: t("contribution"), value: `${formatAzn(ad.monthlyContribution, locale)} ${c("perMonth")}` } : null,
    !hasPlace && ad.budgetMin != null && ad.budgetMax != null ? { label: t("budget"), value: `${t("budgetRange", { min: ad.budgetMin, max: ad.budgetMax })} ${c("perMonth")}` } : null,
    hasPlace && ad.accommodationType ? { label: t("homeType"), value: cat(ad.accommodationType) } : null,
    !hasPlace && ad.desiredPropertyType ? { label: t("desiredHome"), value: cat(ad.desiredPropertyType) } : null,
    hasPlace && ad.currentResidents != null ? { label: t("currentResidents"), value: c("people", { count: ad.currentResidents }) } : null,
    hasPlace && ad.availableSpaces != null ? { label: t("availableSpaces"), value: c("places", { count: ad.availableSpaces }) } : null,
    !hasPlace && ad.groupSize != null ? { label: t("groupSize"), value: c("people", { count: ad.groupSize }) } : null,
    { label: t("moveIn"), value: formatDate(ad.moveInDate, locale) },
    { label: t("duration"), value: c("months", { count: ad.durationMonths }) },
    ad.university ? { label: t("university"), value: `${ad.university.shortName} — ${nameOf(ad.university, locale)}` } : null,
    { label: t("genderPref"), value: e(`gender.${ad.genderPreference}`) },
  ].filter((x): x is { label: string; value: string } => Boolean(x));

  const unset = t("notSpecified");
  const lifestyle = [
    { label: t("smoking"), value: ad.smoking ? e(`smoking.${ad.smoking}`) : unset },
    { label: t("cleaning"), value: ad.cleaning ? e(`cleaning.${ad.cleaning}`) : unset },
    { label: t("sleep"), value: ad.sleepSchedule ? e(`sleep.${ad.sleepSchedule}`) : unset },
    { label: t("guests"), value: ad.guests ? e(`guests.${ad.guests}`) : unset },
    { label: t("noise"), value: ad.noise ? e(`noise.${ad.noise}`) : unset },
    { label: t("pets"), value: ad.petsOk ? t("petsOk") : t("petsNo") },
  ];

  return (
    <article className="shell pt-8 lg:pt-12">
      {!isPublic && (
        <p role="status" className="mb-4 flex items-start gap-2 rounded-xl bg-warn-soft px-4 py-3 text-sm font-medium text-warn">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          {e(`roommateStatus.${status}`)}
          {ad.rejectionReason && ` — ${ad.rejectionReason}`}
        </p>
      )}
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_25.5rem] lg:gap-[30px] xl:gap-[60px]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`tag ${hasPlace ? "bg-brand text-white" : "bg-brand-soft text-brand"}`}>{e(`roommateType.${ad.type}`)}</span>
            {ad.isDemo && (
              <span className="tag bg-mist text-ink-2" title={c("demoHint")}>
                {c("demo")}
              </span>
            )}
          </div>
          <h1 className="t-display mt-3" lang={ad.originalLocale}>
            {ad.title}
          </h1>
          <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-ink-2">
            <span className="inline-flex items-center gap-1.5">
              {ad.metroStation ? <MetroDot line={ad.metroStation.line} /> : <MapPin className="size-4" aria-hidden />}
              {hasPlace
                ? [ad.metroStation ? nameOf(ad.metroStation, locale) : null, ad.neighborhood ? nameOf(ad.neighborhood, locale) : null, ad.district ? nameOf(ad.district, locale) : null].filter(Boolean).join(" · ")
                : ad.preferredDistricts.map((p) => nameOf(p.district, locale)).join(" · ")}
            </span>
            {ad.publishedAt && (
              <span className="inline-flex items-center gap-1.5 text-sm text-ink-3">
                <CalendarDays className="size-4" aria-hidden />
                {c("postedOn", { date: formatDate(ad.publishedAt, locale) })}
              </span>
            )}
          </p>
          {ad.originalLocale !== locale && <p className="mt-3 text-sm text-ink-3">{t("originalLanguage", { language: langs(ad.originalLocale) })}</p>}

          {match && (
            <section className="mt-6 rounded-2xl bg-ok-soft p-6" aria-labelledby="match-h">
              <h2 id="match-h" className="t-h3 text-ok">
                {t("matchTitle", { score: match.score })}
              </h2>
              <p className="mt-1 text-sm text-ink-2">{t("matchExplain")}</p>
              {match.reasons.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {match.reasons.map((r) => (
                    <li key={r} className="tag bg-paper text-ink">
                      <Check className="size-3.5 text-ok" aria-hidden />
                      {t(`reasons.${r}`)}
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-[0.8125rem] text-ink-3">{t("matchDisclaimer")}</p>
              <details className="mt-2 text-[0.8125rem] text-ink-3">
                <summary className="cursor-pointer font-semibold text-ink-2">{t("matchHowTitle")}</summary>
                <p className="mt-1">{t("matchHow")}</p>
              </details>
            </section>
          )}

          <div className="mt-8 max-w-prose text-[0.9375rem] leading-relaxed whitespace-pre-line text-ink-2" lang={ad.originalLocale}>
            {ad.description}
          </div>

          <section className="mt-10">
            <dl className="grid grid-cols-1 gap-x-10 border-t border-line pt-4 sm:grid-cols-2">
              {rows.map((r) => (
                <div key={r.label} className="flex gap-4 py-2">
                  <dt className="w-40 shrink-0 font-semibold">{r.label}</dt>
                  <dd className="text-ink-2">{r.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="mt-10" aria-labelledby="life-h">
            <h2 id="life-h" className="t-h3">
              {t("lifestyle")}
            </h2>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              {lifestyle.map((r) => (
                <div key={r.label} className="rounded-xl border border-line px-4 py-3">
                  <dt className="text-sm text-ink-2">{r.label}</dt>
                  <dd className="font-medium">{r.value}</dd>
                </div>
              ))}
            </dl>
            {ad.houseRules && (
              <div className="mt-6">
                <h3 className="font-semibold">{t("houseRules")}</h3>
                <p className="mt-2 whitespace-pre-line text-ink-2" lang={ad.originalLocale}>
                  {ad.houseRules}
                </p>
              </div>
            )}
          </section>

          {ad.listing && ad.listing.status === "PUBLISHED" && (
            <Link href={`/listings/${ad.listing.id}`} className="btn btn-outline mt-8">
              {t("linkedListing")}
            </Link>
          )}

          <div className="mt-8 border-t border-line pt-4">{!isOwner && isPublic && <ReportDialog target={{ roommateAdId: ad.id }} loggedIn={Boolean(user)} />}</div>
        </div>

        <aside className="space-y-[30px] lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-2xl border border-line p-6 sm:p-[30px]">
            <h2 className="text-sm font-semibold text-ink-2">{t("aboutAuthor")}</h2>
            <p className="mt-2 font-display text-lg font-semibold">{ad.owner.name.split(" ")[0]}</p>
            {showProfile && (
              <>
                <ul className="mt-2 space-y-1 text-sm text-ink-2">
                  {ad.owner.profile?.university && <li>{ad.owner.profile.university.shortName}</li>}
                  {ad.owner.profile?.studyYear && <li>{t("studyYear", { year: ad.owner.profile.studyYear })}</li>}
                  {ad.owner.profile?.hometown && (
                    <li>
                      {t("hometown")}: {ad.owner.profile.hometown}
                    </li>
                  )}
                </ul>
                {ad.owner.profile?.bio && <p className="mt-3 border-t border-line pt-3 text-sm text-ink-2">{ad.owner.profile.bio}</p>}
              </>
            )}
            {canManage && !ad.showProfile && <p className="mt-3 text-sm text-ink-3">{t("profileHiddenNote")}</p>}
            {!isOwner && isPublic && (
              <div className="mt-4">
                <SaveRoommateButton adId={ad.id} initialSaved={saved} loggedIn={Boolean(user)} />
              </div>
            )}
          </div>
          <div className="rounded-2xl border border-line p-6 sm:p-[30px]">
            {canManage ? (
              <>
                {isOwner && <p className="mb-3 text-sm text-ink-2">{t("ownAd")}</p>}
                <Link href={`/account/roommates/${ad.id}/edit`} className="btn btn-dark w-full">
                  {t("manage")}
                </Link>
              </>
            ) : !isPublic ? null : user ? (
              <>
                <h2 className="t-h3 mb-1">{t("contactTitle")}</h2>
                <p className="mb-2 text-sm text-ink-2">{t("contactLead")}</p>
                <p className="mb-4 text-sm text-ink-3">{t("contactPrefNote", { pref: e(`contactPref.${ad.contactPreference}`) })}</p>
                <ContactPanel target={{ roommateAdId: ad.id }} canPhone={false} placeholder={contactT("messagePlaceholder")} />
              </>
            ) : (
              <Link href={`/login?next=${encodeURIComponent(`/${locale}/roommates/${ad.id}`)}`} className="btn btn-primary w-full">
                {t("loginToContact")}
              </Link>
            )}
          </div>
        </aside>
      </div>
    </article>
  );
}
