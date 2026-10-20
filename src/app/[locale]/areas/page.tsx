import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { alternatesFor } from "@/lib/seo";
import { db } from "@/server/db";
import { publicListingWhere } from "@/server/listings/queries";
import { nameOf, nameSelect } from "@/lib/i18n-data";
import { universitiesWithCounts } from "@/server/home";
import { MetroDot } from "@/components/listings/category-tag";

type Props = { params: Promise<{ locale: AppLocale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return { title: t("areasTitle"), description: t("areasDescription"), alternates: alternatesFor(locale, "/areas") };
}

export default async function AreasPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, c] = await Promise.all([getTranslations({ locale, namespace: "areas" }), getTranslations({ locale, namespace: "common" })]);
  const [districts, metros, byDistrict, byArea, byMetro, unis] = await Promise.all([
    db.district.findMany({
      orderBy: { sortOrder: "asc" },
      select: { id: true, slug: true, ...nameSelect, neighborhoods: { select: { id: true, slug: true, ...nameSelect }, orderBy: { nameAz: "asc" } } },
    }),
    db.metroStation.findMany({ select: { id: true, slug: true, line: true, ...nameSelect }, orderBy: { nameAz: "asc" } }),
    db.listing.groupBy({ by: ["districtId"], where: publicListingWhere(), _count: { _all: true } }),
    db.listing.groupBy({ by: ["neighborhoodId"], where: publicListingWhere(), _count: { _all: true } }),
    db.listing.groupBy({ by: ["metroStationId"], where: publicListingWhere(), _count: { _all: true } }),
    universitiesWithCounts(locale),
  ]);
  const dCount = new Map(byDistrict.map((x) => [x.districtId, x._count._all]));
  const aCount = new Map(byArea.map((x) => [x.neighborhoodId, x._count._all]));
  const mCount = new Map(byMetro.map((x) => [x.metroStationId, x._count._all]));
  const lines = (["RED", "GREEN", "PURPLE"] as const).map((line) => ({ line, stations: metros.filter((m) => m.line === line) }));

  return (
    <div className="shell pt-8">
      <h1 className="t-h2">{t("heading")}</h1>
      <p className="mt-2 max-w-2xl text-ink-2">{t("lead")}</p>

      <section className="mt-10" aria-labelledby="d-h">
        <h2 id="d-h" className="t-h3 mb-4">
          {t("districts")}
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {districts.map((d) => (
            <li key={d.id} className="card p-5">
              <div className="flex items-baseline justify-between gap-3">
                <Link href={`/students?district=${d.slug}`} className="font-display text-lg font-semibold hover:underline">
                  {nameOf(d, locale)}
                </Link>
                <span className="text-sm text-ink-3">{t("listings", { count: dCount.get(d.id) ?? 0 })}</span>
              </div>
              {d.neighborhoods.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {d.neighborhoods.map((n) => (
                    <li key={n.id}>
                      <Link href={`/students?district=${d.slug}&area=${n.slug}`} className="chip hover:border-ink">
                        {nameOf(n, locale)}
                        <span className="text-ink-3">{aCount.get(n.id) ?? 0}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-14" aria-labelledby="m-h">
        <h2 id="m-h" className="t-h3 mb-4">
          {t("metro")}
        </h2>
        <div className="grid gap-6 lg:grid-cols-3">
          {lines.map(({ line, stations }) => (
            <div key={line}>
              <h3 className="mb-2 flex items-center gap-2 font-semibold">
                <MetroDot line={line} className="size-5" />
                {c(`metroLine.${line}`)}
              </h3>
              <ul className="border-l-2 pl-4" style={{ borderColor: line === "RED" ? "#d7263d" : line === "GREEN" ? "#2e9e4a" : "#7a4ea3" }}>
                {stations.map((m) => (
                  <li key={m.id}>
                    <Link href={`/students?metro=${m.slug}`} className="flex min-h-10 items-center justify-between gap-3 text-[0.9375rem] hover:underline">
                      {nameOf(m, locale)}
                      <span className="text-sm text-ink-3">{mCount.get(m.id) ?? 0}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-14" aria-labelledby="u-h">
        <h2 id="u-h" className="t-h3 mb-4">
          {t("universities")}
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {unis.map((u) => (
            <li key={u.slug} className="card p-4">
              <p className="font-display font-semibold">{u.short}</p>
              <p className="text-sm text-ink-2">{u.name}</p>
              {u.metro && <p className="mt-1 text-sm text-ink-3">{t("nearestMetro", { name: u.metro.name })}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href={`/students?uni=${u.slug}`} className="btn btn-outline btn-sm">
                  {t("studentsIn")} · {u.count}
                </Link>
                <Link href={`/roommates?uni=${u.slug}`} className="btn btn-ghost btn-sm">
                  {t("roommatesIn")}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
