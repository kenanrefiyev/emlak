import { getTranslations, setRequestLocale } from "next-intl/server";
import { LogOut } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { requireUser } from "@/server/auth/current";
import { db } from "@/server/db";
import { logoutAction } from "@/app/[locale]/(auth)/actions";
import { SettingsForm } from "@/components/dashboard/profile-forms";
import { PasswordForm } from "@/components/account/profile-forms";

export default async function SettingsPage({ params }: { params: Promise<{ locale: AppLocale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireUser(locale);
  const [t, a, account] = await Promise.all([
    getTranslations({ locale, namespace: "dashboard" }),
    getTranslations({ locale, namespace: "account" }),
    db.user.findUnique({ where: { id: user.id }, select: { preferredLocale: true, emailVerifiedAt: true, profile: { select: { sharePhoneOnAccept: true } } } }),
  ]);
  return (
    <div className="max-w-3xl space-y-12">
      <div>
        <h1 className="t-h2">{t("nav.settings")}</h1>
        <p className="mt-1 text-sm text-ink-2">{t("settings.lead")}</p>
      </div>
      <section aria-labelledby="pref-h">
        <h2 id="pref-h" className="t-h3 mb-4">
          {t("settings.preferences")}
        </h2>
        <SettingsForm values={{ preferredLocale: account?.preferredLocale ?? locale, sharePhoneOnAccept: account?.profile?.sharePhoneOnAccept ?? true }} />
      </section>
      <section aria-labelledby="pw-h" className="border-t border-line pt-10">
        <h2 id="pw-h" className="t-h3 mb-1">
          {a("changePassword")}
        </h2>
        <p className="mb-4 text-sm text-ink-2">
          {user.email} · {account?.emailVerifiedAt ? a("emailVerified") : a("emailUnverified")}
        </p>
        <PasswordForm />
      </section>
      <section aria-labelledby="out-h" className="border-t border-line pt-10">
        <h2 id="out-h" className="t-h3 mb-4">
          {t("settings.session")}
        </h2>
        <div className="flex flex-wrap gap-3">
          <form action={logoutAction.bind(null, locale)}>
            <button type="submit" className="btn btn-outline">
              <LogOut className="size-4" aria-hidden />
              {t("settings.logout")}
            </button>
          </form>
          <Link href="/account/security" className="btn btn-ghost text-danger">
            {t("settings.deleteAccount")}
          </Link>
        </div>
      </section>
    </div>
  );
}
