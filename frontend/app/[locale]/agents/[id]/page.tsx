import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BadgeCheck, Building2, Globe, MapPin } from "lucide-react";
import type { AppLocale } from "@/i18n/routing";
import { db } from "@/server/db";
import { getCurrentUser } from "@/server/auth/current";
import { listingCards } from "@/server/listings/queries";
import { savedIdsFor } from "@/server/engagement";
import { alternatesFor } from "@/lib/seo";
import { formatDate } from "@/lib/format";
import { ListingCard } from "@/components/listings/listing-card";
import { EmptyState } from "@/components/site/section";

type Props = { params: Promise<{ locale: AppLocale; id: string }> };

async function loadAgent(id: string) {
  if (!/^[a-z0-9]{10,40}$/.test(id)) return null;
  return db.user.findFirst({
    where: { id, role: "AGENT", status: "ACTIVE" },
    select: { id: true, name: true, createdAt: true, agentProfile: true },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  const agent = await loadAgent(id);
  if (!agent) return {};
  return { title: agent.agentProfile?.companyName ?? agent.name, alternates: alternatesFor(locale, `/agents/${id}`) };
}

/** Public agent profile (Homelengo agent-detail pattern): business card + their live listings. */
export default async function AgentPublicPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const agent = await loadAgent(id);
  if (!agent) notFound();
  const [t, c, a, user] = await Promise.all([
    getTranslations({ locale, namespace: "listing" }),
    getTranslations({ locale, namespace: "common" }),
    getTranslations({ locale, namespace: "search" }),
    getCurrentUser(),
  ]);
  const listings = await listingCards(locale, { ownerId: agent.id }, 24);
  const saved = await savedIdsFor(user?.id, listings.map((l) => l.id));
  const p = agent.agentProfile;
  return (
    <div className="shell pt-8">
      <header className="flex flex-col gap-4 rounded-3xl bg-mist p-6 sm:flex-row sm:items-center sm:p-8">
        <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-ink text-white">
          <Building2 className="size-8" aria-hidden />
        </span>
        <div className="min-w-0">
          <h1 className="t-h2">{p?.companyName ?? agent.name}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-ink-2">
            {c("agent")}
            {p?.verificationStatus === "VERIFIED" && (
              <span className="tag bg-ok-soft text-ok">
                <BadgeCheck className="size-3.5" aria-hidden />
                {c("verifiedAgent")}
              </span>
            )}
            <span className="text-sm text-ink-3">· {t("memberSince", { date: formatDate(agent.createdAt, locale, { day: undefined }) })}</span>
          </p>
          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-2">
            {p?.officeAddress && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-4" aria-hidden />
                {p.officeAddress}
              </span>
            )}
            {p?.website && (
              <a href={p.website} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1.5 hover:underline">
                <Globe className="size-4" aria-hidden />
                {new URL(p.website).hostname}
              </a>
            )}
          </p>
        </div>
      </header>
      {p?.about && <p className="mt-6 max-w-3xl whitespace-pre-line text-ink-2">{p.about}</p>}
      <h2 className="t-h3 mt-10 mb-4">{a("results", { count: listings.length })}</h2>
      {listings.length === 0 ? (
        <EmptyState title={a("emptyTitle")} />
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {listings.map((l) => (
            <li key={l.id}>
              <ListingCard listing={l} locale={locale} saved={saved.has(l.id)} loggedIn={Boolean(user)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
