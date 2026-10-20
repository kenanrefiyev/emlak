import { getTranslations, setRequestLocale } from "next-intl/server";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { requireUser } from "@/server/auth/current";
import { contactRequestsFor, markRequestsRead } from "@/server/engagement";
import { formatDate, formatPhone, whatsappLink } from "@/lib/format";
import { EmptyState } from "@/components/site/section";
import { OpButton } from "@/components/account/op-button";
import { respondContactAction } from "@/app/[locale]/account/actions";

const tone = { PENDING: "bg-warn-soft text-warn", ACCEPTED: "bg-ok-soft text-ok", DECLINED: "bg-mist text-ink-3" } as const;

export default async function RequestsPage({ params }: { params: Promise<{ locale: AppLocale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireUser(locale);
  const [t, e] = await Promise.all([getTranslations({ locale, namespace: "account" }), getTranslations({ locale, namespace: "enums" })]);
  const { incoming, outgoing } = await contactRequestsFor(user.id);
  await markRequestsRead(user.id);

  type Req = (typeof incoming)[number];
  const item = (r: Req, dir: "in" | "out") => (
    <li key={r.id} className="card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`tag ${tone[r.status]}`}>{e(`requestStatus.${r.status}`)}</span>
        <span className="font-semibold">{dir === "in" ? t("requestFrom", { name: r.other.name }) : t("requestTo", { name: r.other.name })}</span>
        <span className="ml-auto text-sm text-ink-3">{formatDate(r.createdAt, locale)}</span>
      </div>
      {r.target && (
        <p className="mt-1 text-sm text-ink-2">
          <Link href={r.target.kind === "listing" ? `/listings/${r.target.id}` : `/roommates/${r.target.id}`} className="hover:underline">
            {t("requestAbout", { title: r.target.title })}
          </Link>
        </p>
      )}
      <p className="mt-3 whitespace-pre-line rounded-xl bg-mist px-4 py-3 text-[0.9375rem]">{r.message}</p>
      {r.contact ? (
        <div className="mt-3">
          <p className="text-sm font-semibold">{t("contactRevealed")}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <a href={`mailto:${r.contact.email}`} className="btn btn-outline btn-sm">
              <Mail className="size-4" aria-hidden /> {r.contact.email}
            </a>
            {r.contact.phone ? (
              <>
                <a href={`tel:${r.contact.phone}`} className="btn btn-outline btn-sm">
                  <Phone className="size-4" aria-hidden /> {formatPhone(r.contact.phone)}
                </a>
                {whatsappLink(r.contact.phone) && (
                  <a href={whatsappLink(r.contact.phone)!} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">
                    <MessageCircle className="size-4" aria-hidden /> {t("whatsapp")}
                  </a>
                )}
              </>
            ) : (
              <p className="text-sm text-ink-3">{t("noPhoneShared")}</p>
            )}
          </div>
        </div>
      ) : r.status === "PENDING" && dir === "in" ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <OpButton action={respondContactAction} id={r.id} op="respond" extra={{ decision: "accept" }} label={t("accept")} variant="primary" />
          <OpButton action={respondContactAction} id={r.id} op="respond" extra={{ decision: "decline" }} label={t("decline")} />
        </div>
      ) : r.status === "PENDING" ? (
        <p className="mt-3 text-sm text-ink-3">{t("contactHidden")}</p>
      ) : null}
    </li>
  );

  return (
    <div>
      <h1 className="t-h2 mb-6">{t("nav.requests")}</h1>
      {incoming.length === 0 && outgoing.length === 0 ? (
        <EmptyState title={t("emptyRequestsTitle")} body={t("emptyRequestsBody")} />
      ) : (
        <div className="space-y-10">
          <section aria-labelledby="in-h">
            <h2 id="in-h" className="t-h3 mb-3">
              {t("requestsIncoming")} ({incoming.length})
            </h2>
            <ul className="space-y-3">{incoming.map((r) => item(r, "in"))}</ul>
          </section>
          <section aria-labelledby="out-h">
            <h2 id="out-h" className="t-h3 mb-3">
              {t("requestsOutgoing")} ({outgoing.length})
            </h2>
            <ul className="space-y-3">{outgoing.map((r) => item(r, "out"))}</ul>
          </section>
        </div>
      )}
    </div>
  );
}
