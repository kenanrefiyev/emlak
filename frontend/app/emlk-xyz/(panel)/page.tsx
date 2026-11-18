import Link from "next/link";
import { BadgeCheck, Building2, Flag, Inbox, UsersRound, Wallet } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { requireAdmin } from "@/server/auth/current";
import { db } from "@/server/db";
import { AdminPage, CATEGORY_AZ, Panel, fmtDate } from "@/components/admin/ui";

export default async function AdminDashboard() {
  await requireAdmin();
  const [pendingListings, pendingRoommates, openReports, pendingVerifications, subRequests, openSupport, latest] = await Promise.all([
    db.listing.count({ where: { status: "PENDING_REVIEW" } }),
    db.roommateAd.count({ where: { status: "PENDING_REVIEW" } }),
    db.report.count({ where: { status: "OPEN" } }),
    db.verificationRequest.count({ where: { status: "PENDING" } }),
    db.subscription.count({ where: { status: "REQUESTED" } }),
    db.supportMessage.count({ where: { status: "OPEN" } }),
    db.listing.findMany({
      where: { status: "PENDING_REVIEW" },
      orderBy: { submittedAt: "asc" },
      take: 6,
      select: { id: true, category: true, currency: true, monthlyRent: true, submittedAt: true, translations: { where: { isOriginal: true }, select: { title: true } }, owner: { select: { name: true } } },
    }),
  ]);
  const tiles = [
    { href: "/emlk-xyz/elanlar", label: "Yoxlama gözləyən elanlar", value: pendingListings, icon: Building2 },
    { href: "/emlk-xyz/ev-yoldasi", label: "Ev yoldaşı elanları", value: pendingRoommates, icon: UsersRound },
    { href: "/emlk-xyz/sikayetler", label: "Açıq şikayətlər", value: openReports, icon: Flag },
    { href: "/emlk-xyz/sikayetler#muracietler", label: "Cavabsız müraciətlər", value: openSupport, icon: Inbox },
    { href: "/emlk-xyz/tesdiq", label: "Makler təsdiqi sorğuları", value: pendingVerifications, icon: BadgeCheck },
    { href: "/emlk-xyz/abunelikler", label: "Paket sorğuları", value: subRequests, icon: Wallet },
  ];
  return (
    <AdminPage title="İdarəetmə paneli" lead="Moderasiya növbəsi və diqqət tələb edən sorğular.">
      <ul className="grid gap-[30px] sm:grid-cols-2 xl:grid-cols-3">
        {tiles.map((t) => (
          <li key={t.href}>
            <Link href={t.href} className="flex items-center gap-5 rounded-xl bg-paper p-6 transition-shadow hover:shadow-pop">
              <span className="grid size-[4.5rem] shrink-0 place-items-center rounded-full border border-line text-brand">
                <t.icon className="size-7" strokeWidth={1.5} aria-hidden />
              </span>
              <span>
                <span className="block font-semibold">{t.label}</span>
                <span className="t-price mt-1 block text-3xl">{t.value}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <Panel title="Ən köhnə yoxlama gözləyən elanlar">
        {latest.length === 0 ? (
          <p className="text-ink-2">Növbə boşdur.</p>
        ) : (
          <ul className="divide-y divide-line">
            {latest.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <span>
                  <Link href={`/emlk-xyz/elanlar?q=${l.id}`} className="font-semibold hover:text-brand">
                    {l.translations[0]?.title}
                  </Link>
                  <span className="block text-sm text-ink-2">
                    {CATEGORY_AZ[l.category]} · {formatMoney(l.monthlyRent, l.currency, "az")} · {l.owner.name}
                  </span>
                </span>
                <span className="text-sm text-ink-2">{fmtDate(l.submittedAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </AdminPage>
  );
}
