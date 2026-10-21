import { getTranslations, setRequestLocale } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";
import { requireUser } from "@/server/auth/current";
import { db } from "@/server/db";
import { getLocationOptions } from "@/server/locations";
import { ProfileForm } from "@/components/account/profile-forms";

export default async function ProfilePage({ params }: { params: Promise<{ locale: AppLocale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireUser(locale);
  const [t, profile, options] = await Promise.all([
    getTranslations({ locale, namespace: "account" }),
    db.userProfile.findUnique({ where: { userId: user.id } }),
    getLocationOptions(locale, "id"),
  ]);
  return (
    <div className="max-w-3xl">
      <h1 className="t-h2 mb-6">{t("profileTitle")}</h1>
      <ProfileForm
        universities={options.universities.map((u) => ({ value: u.value, label: u.label }))}
        values={{
          name: user.name,
          phone: user.phone,
          bio: profile?.bio ?? null,
          hometown: profile?.hometown ?? null,
          universityId: profile?.universityId ?? null,
          studyYear: profile?.studyYear ?? null,
          sharePhoneOnAccept: profile?.sharePhoneOnAccept ?? true,
          preferredLocale: user.preferredLocale,
        }}
      />
    </div>
  );
}
