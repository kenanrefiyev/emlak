import { requireAdmin } from "@/server/auth/current";
import { db } from "@/server/db";
import { AdminPage, Panel, StatusPill, Table, Tabs, fmtDate } from "@/components/admin/ui";
import { OpButton } from "@/components/account/op-button";
import { moderateRoommateAction } from "@/app/admin/actions";
import { ROOMMATE_STATUSES } from "@/lib/domain";

export const metadata = { title: "Ev yoldaşı elanları" };

const STATUS_LABEL: Record<string, string> = {
  PENDING_REVIEW: "Yoxlamada",
  PUBLISHED: "Dərc olunub",
  REJECTED: "Rədd edilib",
  CLOSED: "Bağlanıb",
  ARCHIVED: "Arxivdə",
  DRAFT: "Qaralama",
};

export default async function AdminRoommates({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const status = (ROOMMATE_STATUSES as readonly string[]).includes(sp.status ?? "") ? sp.status! : "PENDING_REVIEW";
  const [counts, rows] = await Promise.all([
    db.roommateAd.groupBy({ by: ["status"], _count: { _all: true } }),
    db.roommateAd.findMany({
      where: { status: status as never },
      orderBy: { submittedAt: "asc" },
      take: 100,
      include: {
        owner: { select: { name: true, email: true } },
        district: { select: { nameAz: true } },
        preferredDistricts: { include: { district: { select: { nameAz: true } } } },
        _count: { select: { reports: { where: { status: "OPEN" } } } },
      },
    }),
  ]);
  return (
    <AdminPage title="Ev yoldaşı elanları" lead="Şəxsi məlumat (telefon, dəqiq ünvan) yazılmış və ayrı-seçkilik edən elanları rədd edin.">
      <Tabs
        active={status}
        items={ROOMMATE_STATUSES.map((s) => ({ key: s, href: `/admin/ev-yoldasi?status=${s}`, label: STATUS_LABEL[s] ?? s, count: counts.find((c) => c.status === s)?._count._all ?? 0 }))}
      />
      <Panel>
        <Table head={["Elan", "Sahibi", "Status", "Tarix", "Əməliyyatlar"]} empty={rows.length === 0}>
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="w-[42%]">
                <a href={`/az/roommates/${r.id}`} target="_blank" rel="noreferrer" className="font-semibold hover:text-brand">
                  {r.title}
                </a>
                <p className="text-ink-2">
                  {r.type === "HAS_PLACE" ? `Yer var · ${r.district?.nameAz ?? "—"} · ${r.monthlyContribution} ₼` : `Birgə kirayə · ${r.preferredDistricts.map((p) => p.district.nameAz).join(", ")} · ${r.budgetMin}–${r.budgetMax} ₼`}
                </p>
                <p className="mt-1 line-clamp-3 text-xs text-ink-3">{r.description}</p>
                {r._count.reports > 0 && <span className="tag mt-1 bg-danger-soft text-danger">{r._count.reports} şikayət</span>}
              </td>
              <td>
                <p className="font-medium">{r.owner.name}</p>
                <p className="text-ink-2">{r.owner.email}</p>
              </td>
              <td>
                <StatusPill status={r.status} label={STATUS_LABEL[r.status]} />
              </td>
              <td className="whitespace-nowrap text-ink-2">{fmtDate(r.submittedAt ?? r.createdAt)}</td>
              <td>
                <div className="flex flex-wrap gap-1.5">
                  {(r.status === "PENDING_REVIEW" || r.status === "REJECTED") && <OpButton action={moderateRoommateAction} id={r.id} op="approve" label="Təsdiqlə" variant="primary" />}
                  {(r.status === "PENDING_REVIEW" || r.status === "PUBLISHED") && (
                    <OpButton action={moderateRoommateAction} id={r.id} op="reject" label="Rədd et" prompt="Rədd səbəbi (elan sahibi görəcək):" />
                  )}
                  <OpButton action={moderateRoommateAction} id={r.id} op="delete" label="Sil" variant="danger" confirm="Elan birdəfəlik silinsin?" />
                </div>
              </td>
            </tr>
          ))}
        </Table>
      </Panel>
    </AdminPage>
  );
}
