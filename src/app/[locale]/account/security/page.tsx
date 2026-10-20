import { getTranslations, setRequestLocale } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";
import { requireUser } from "@/server/auth/current";
import { DeleteAccountForm, PasswordForm } from "@/components/account/profile-forms";
import { logoutAction } from "@/app/[locale]/(auth)/actions";

export default async function SecurityPage({ params }: { params: Promise<{ locale: AppLocale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireUser(locale);
  const [t, a, nav] = await Promise.all([
    getTranslations({ locale, namespace: "account" }),
    getTranslations({ locale, namespace: "auth" }),
    getTranslations({ locale, namespace: "nav" }),
  ]);
  return (
    <div className="max-w-3xl space-y-12">
      <div>
        <h1 className="t-h2">{t("securityTitle")}</h1>
        <p className="mt-2 text-ink-2">
          {a("email")}: {user.email} · {user.emailVerifiedAt ? t("emailVerified") : t("emailUnverified")}
        </p>
      </div>
      <section aria-labelledby="pw-h">
        <h2 id="pw-h" className="t-h3 mb-4">
          {t("changePassword")}
        </h2>
        <PasswordForm />
      </section>
      <section>
        <form action={logoutAction.bind(null, locale)}>
          <button type="submit" className="btn btn-outline">
            {nav("logout")}
          </button>
        </form>
      </section>
      {user.role !== "ADMIN" && (
        <section aria-labelledby="del-h" className="rounded-2xl border border-danger/30 p-6">
          <h2 id="del-h" className="t-h3 text-danger">
            {t("deleteAccount")}
          </h2>
          <p className="mt-2 mb-4 text-ink-2">{t("deleteAccountLead")}</p>
          <DeleteAccountForm />
        </section>
      )}
    </div>
  );
}
