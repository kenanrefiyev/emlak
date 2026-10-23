import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { BadgeCheck, BedDouble, MapPin, Ruler, Users } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import type { ListingCardData } from "@/server/listings/queries";
import { formatAzn } from "@/lib/format";
import { SHARED_CATEGORIES } from "@/lib/domain";
import { SaveButton } from "./save-button";

/**
 * Property card in the Homelengo composition: 3:2 photo with flag pills and
 * the location over a bottom gradient, title, "label: value" facts, a rule,
 * then the advertiser and the price.
 */
export async function ListingCard({
  listing: l,
  locale,
  saved,
  loggedIn,
  layout = "grid",
  priority = false,
}: {
  listing: ListingCardData;
  locale: AppLocale;
  saved: boolean;
  loggedIn: boolean;
  layout?: "grid" | "list";
  priority?: boolean;
}) {
  const [c, cat, card, e] = await Promise.all([
    getTranslations({ locale, namespace: "common" }),
    getTranslations({ locale, namespace: "categories" }),
    getTranslations({ locale, namespace: "card" }),
    getTranslations({ locale, namespace: "enums" }),
  ]);
  const shared = SHARED_CATEGORIES.includes(l.category);
  const list = layout === "list";
  const where = [l.metro ? `${l.metro.name} m.` : l.neighborhood, l.district].filter(Boolean).join(", ");

  const facts: { icon: React.ReactNode; label: string; value: string }[] = shared
    ? [
        l.availableSpaces != null ? { icon: <BedDouble className="size-4" aria-hidden />, label: card("metaSpaces"), value: String(l.availableSpaces) } : null,
        l.residentsCount != null ? { icon: <Users className="size-4" aria-hidden />, label: card("metaResidents"), value: String(l.residentsCount) } : null,
      ].filter((x) => x !== null)
    : [
        l.rooms != null ? { icon: <BedDouble className="size-4" aria-hidden />, label: card("metaRooms"), value: String(l.rooms) } : null,
        l.areaSqm != null ? { icon: <Ruler className="size-4" aria-hidden />, label: card("metaArea"), value: `${l.areaSqm} m²` } : null,
      ].filter((x) => x !== null);
  if (l.university) facts.push({ icon: null, label: card("metaUni"), value: l.university });

  return (
    <article className={`group relative flex overflow-hidden rounded-2xl border border-line bg-paper ${list ? "flex-col md:flex-row" : "flex-col"}`}>
      <div className={`relative shrink-0 overflow-hidden bg-gray ${list ? "aspect-[3/2] md:aspect-auto md:w-[22rem]" : "aspect-[3/2]"}`}>
        {l.image ? (
          <Image
            src={l.image.url}
            alt={l.title}
            fill
            priority={priority}
            sizes={list ? "(min-width: 768px) 352px, 100vw" : "(min-width: 1280px) 410px, (min-width: 640px) 50vw, 100vw"}
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full place-items-center text-sm text-ink-2">{c("noPhoto")}</div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent" aria-hidden />
        <ul className="absolute top-4 left-4 flex flex-wrap gap-1.5">
          {l.isFeatured && <li className="flag !bg-brand">{c("featured")}</li>}
          <li className="flag">{cat(l.category)}</li>
          {l.availability !== "AVAILABLE" && <li className="flag !bg-warn !text-white">{e(`availability.${l.availability}`)}</li>}
          {l.isDemo && (
            <li className="flag !bg-white/90 !text-ink" title={c("demoHint")}>
              {c("demo")}
            </li>
          )}
        </ul>
        <div className="absolute top-3 right-3 z-10">
          <SaveButton listingId={l.id} initialSaved={saved} loggedIn={loggedIn} />
        </div>
        <p className="absolute inset-x-4 bottom-3.5 flex items-center gap-1.5 text-sm text-white">
          <MapPin className="size-4 shrink-0" aria-hidden />
          <span className="truncate">{where}</span>
        </p>
      </div>

      <div className="flex min-w-0 flex-1 flex-col px-5 pt-4 pb-5">
        <h3 className="text-lg leading-snug font-semibold" lang={l.titleLocale}>
          <Link href={`/listings/${l.id}`} className="line-clamp-1 transition-colors after:absolute after:inset-0 after:content-[''] hover:text-brand group-hover:text-brand">
            {l.title}
          </Link>
        </h3>
        {facts.length > 0 && (
          <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {facts.map((f) => (
              <li key={f.label} className="flex items-center gap-1.5">
                {f.icon && <span className="text-ink-3">{f.icon}</span>}
                <span className="text-ink-2">{f.label}:</span>
                <span className="font-semibold">{f.value}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-auto pt-4">
        <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
          <span className="flex min-w-0 items-center gap-2.5 text-sm">
            <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-mist font-semibold text-brand">
              {l.ownerName.charAt(0).toLocaleUpperCase(locale)}
            </span>
            <span className="truncate">{l.ownerName}</span>
            {l.isVerified && (
              <span title={c("verified")} className="text-ok">
                <BadgeCheck className="size-4" aria-label={c("verified")} />
              </span>
            )}
          </span>
          <span className="shrink-0 text-right">
            <span className="t-price block text-lg leading-tight">
              {formatAzn(l.monthlyRent, locale)}
              <span className="text-sm font-normal text-ink-2">{c("perMonth")}</span>
            </span>
            <span className="block text-xs text-ink-2">{l.pricePerPlace ? c("perPlace") : c("wholeUnit")}</span>
            {l.monthlyTotal.complete && l.monthlyTotal.value > l.monthlyRent ? (
              <span className="block text-xs font-medium text-ink">{card("totalWithCosts", { total: formatAzn(l.monthlyTotal.value, locale) })}</span>
            ) : l.utilities === "INCLUDED" ? (
              <span className="block text-xs font-medium text-ok">{card("utilitiesIncluded")}</span>
            ) : null}
          </span>
        </div>
        </div>
      </div>
    </article>
  );
}
