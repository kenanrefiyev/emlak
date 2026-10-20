import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("notFound");
  return (
    <div className="shell py-24">
      <p className="t-eyebrow">404</p>
      <h1 className="t-h2 mt-2">{t("title")}</h1>
      <p className="mt-3 max-w-lg text-ink-2">{t("body")}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/" className="btn btn-primary">
          {t("home")}
        </Link>
        <Link href="/students" className="btn btn-outline">
          {t("search")}
        </Link>
      </div>
    </div>
  );
}
