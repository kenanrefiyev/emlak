import { getTranslations, setRequestLocale } from "next-intl/server";
import { BadgeCheck, Clock3, PhoneOff, ShieldAlert } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { requireUser } from "@/server/auth/current";
import { db } from "@/server/db";
import { dashboardKind } from "@/server/dashboard";
import { formatDate, formatPhone } from "@/lib/format";
import { AgentProfileForm } from "@/components/account/agent-forms";
import { AvatarUploader, DashboardProfileForm, VerificationRequestForm } from "@/components/dashboard/profile-forms";

export default async function ProfilePage({ params }: { params: Promise<{ locale: AppLocale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireUser(locale);
  const kind = dashboardKind(user.role);
  const [t, e, account, requests] = await Promise.all([
    getTranslations({ locale, namespace: "dashboard" }),
    getTranslations({ locale, namespace: "enums" }),
    db.user.findUnique({
      where: { id: user.id },
      select: { name: true, phone: true, email: true, role: true, createdAt: true, profile: true, agentProfile: true },
    }),
    db.verificationRequest.findMany({ where: { applicantId: user.id }, orderBy: { createdAt: "desc" }, take: 10 }),
  ]);
  if (!account) return null;
  const status = (kind === "realtor" ? account.agentProfile?.verificationStatus : account.profile?.verificationStatus) ?? "NONE";
  const pending = requests.some((r) => r.status === "PENDING");
  const canApply = status !== "VERIFIED" && !pending;
  const missingForApply = kind === "realtor" ? !account.agentProfile?.companyName && !account.agentProfile?.licenseNumber : !account.phone;

  return (
    <div className="max-w-3xl space-y-12">
      <div>
        <h1 className="t-h2">{t("nav.profile")}</h1>
        <p className="mt-1 text-sm text-ink-2">{t("profile.lead")}</p>
      </div>

      <section aria-labelledby="photo-h" className="space-y-6">
        <h2 id="photo-h" className="sr-only">
          {t("profile.photo")}
        </h2>
        <AvatarUploader url={account.profile?.avatarUrl ?? null} initial={account.name.charAt(0).toLocaleUpperCase(locale)} />
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-xl bg-mist px-4 py-3">
            <dt className="text-ink-2">{t("profile.accountType")}</dt>
            <dd className="font-semibold">{kind === "realtor" ? t("kind.realtor") : t("kind.landlord")}</dd>
            <dd className="mt-0.5 text-xs text-ink-3">{t("profile.accountTypeHint")}</dd>
          </div>
          <div className="rounded-xl bg-mist px-4 py-3">
            <dt className="text-ink-2">{t("profile.phoneStatus")}</dt>
            <dd className="flex items-center gap-1.5 font-semibold">
              <PhoneOff className="size-4 text-ink-3" aria-hidden />
              {account.phone ? formatPhone(account.phone) : t("profile.noPhone")}
            </dd>
            <dd className="mt-0.5 text-xs text-ink-3">{t("profile.smsNotConnected")}</dd>
          </div>
          <div className="rounded-xl bg-mist px-4 py-3">
            <dt className="text-ink-2">{t("profile.email")}</dt>
            <dd className="truncate font-semibold">{account.email}</dd>
            <dd className="mt-0.5 text-xs text-ink-3">{t("profile.memberSince", { date: formatDate(account.createdAt, locale) })}</dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="basic-h">
        <h2 id="basic-h" className="t-h3 mb-4">
          {t("profile.basics")}
        </h2>
        <DashboardProfileForm values={{ name: account.name, phone: account.phone, bio: account.profile?.bio ?? null, languages: account.profile?.languages ?? [] }} />
      </section>

      {kind === "realtor" && (
        <section aria-labelledby="agency-h" className="border-t border-line pt-10">
          <h2 id="agency-h" className="t-h3">
            {t("profile.agency")}
          </h2>
          <p className="mt-1 mb-5 text-sm text-ink-2">{t("profile.agencyLead")}</p>
          <AgentProfileForm
            values={{
              companyName: account.agentProfile?.companyName ?? null,
              licenseNumber: account.agentProfile?.licenseNumber ?? null,
              businessPhone: account.agentProfile?.businessPhone ?? null,
              businessEmail: account.agentProfile?.businessEmail ?? null,
              website: account.agentProfile?.website ?? null,
              about: account.agentProfile?.about ?? null,
              officeAddress: account.agentProfile?.officeAddress ?? null,
            }}
          />
        </section>
      )}

      <section aria-labelledby="ver-h" className="border-t border-line pt-10">
        <div className="flex flex-wrap items-center gap-3">
          <h2 id="ver-h" className="t-h3">
            {t("profile.verification")}
          </h2>
          {status === "VERIFIED" ? (
            <span className="tag bg-ok-soft text-ok">
              <BadgeCheck className="size-3.5" aria-hidden />
              {e("verification.VERIFIED")}
            </span>
          ) : status === "PENDING" ? (
            <span className="tag bg-warn-soft text-warn">
              <Clock3 className="size-3.5" aria-hidden />
              {e("verification.PENDING")}
            </span>
          ) : (
            <span className="tag bg-mist text-ink-2">{e(`verification.${status}`)}</span>
          )}
        </div>
        <p className="mt-2 text-sm text-ink-2">{kind === "realtor" ? t("profile.verificationLeadAgent") : t("profile.verificationLeadLandlord")}</p>
        <p className="mt-2 flex items-start gap-2 text-sm text-ink-3">
          <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {t("profile.verificationHonesty")}
        </p>

        {canApply && (
          <div className="mt-6">
            {missingForApply ? (
              <p className="rounded-xl bg-warn-soft px-4 py-3 text-sm font-medium text-warn">{kind === "realtor" ? t("profile.needAgency") : t("profile.needPhone")}</p>
            ) : (
              <VerificationRequestForm isAgent={kind === "realtor"} />
            )}
          </div>
        )}
        {requests.length > 0 && (
          <div className="mt-8">
            <h3 className="font-semibold">{t("profile.history")}</h3>
            <ul className="mt-3 space-y-2 text-sm">
              {requests.map((r) => (
                <li key={r.id} className="rounded-xl border border-line px-4 py-3">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{t(`profile.review.${r.status}`)}</span>
                    <span className="text-ink-3">{formatDate(r.createdAt, locale)}</span>
                  </p>
                  {r.reviewNote && <p className="mt-1 text-ink-2">{r.reviewNote}</p>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section aria-labelledby="sec-h" className="border-t border-line pt-10">
        <h2 id="sec-h" className="t-h3">
          {t("profile.security")}
        </h2>
        <p className="mt-2 text-sm text-ink-2">{t("profile.securityLead")}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/dashboard/settings" className="btn btn-outline btn-sm">
            {t("nav.settings")}
          </Link>
          <Link href="/account/security" className="btn btn-outline btn-sm">
            {t("profile.changePassword")}
          </Link>
        </div>
      </section>
    </div>
  );
}
