import { requireAdmin } from "@/server/auth/current";
import { db } from "@/server/db";
import { AdminPage, Panel, REPORT_REASON_AZ, StatusPill, Table, Tabs, fmtDate } from "@/components/admin/ui";
import { OpButton } from "@/components/account/op-button";
import { reportAction, userAction } from "@/app/admin/actions";

export const metadata = { title: "Şikayətlər" };

const REPORT_STATUS: Record<string, string> = { OPEN: "Açıq", RESOLVED: "Həll edilib", DISMISSED: "Rədd edilib" };
const SUPPORT_STATUS: Record<string, string> = { OPEN: "Cavabsız", ANSWERED: "Cavablandırılıb", CLOSED: "Bağlanıb" };

export default async function AdminReports({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const status = ["OPEN", "RESOLVED", "DISMISSED"].includes(sp.status ?? "") ? sp.status! : "OPEN";
  const [reports, counts, support] = await Promise.all([
    db.report.findMany({
      where: { status: status as never },
      orderBy: { createdAt: status === "OPEN" ? "asc" : "desc" },
      take: 100,
      include: {
        reporter: { select: { name: true, email: true } },
        reportedUser: { select: { id: true, name: true, email: true, status: true } },
        listing: { select: { id: true, status: true, translations: { where: { isOriginal: true }, select: { title: true } } } },
        roommateAd: { select: { id: true, title: true, status: true } },
        resolver: { select: { name: true } },
      },
    }),
    db.report.groupBy({ by: ["status"], _count: { _all: true } }),
    db.supportMessage.findMany({ orderBy: [{ status: "asc" }, { createdAt: "desc" }], take: 50 }),
  ]);
  return (
    <AdminPage title="Şikayətlər" lead="İstifadəçilərin elanlar barədə şikayətləri və əlaqə formasından gələn müraciətlər.">
      <Tabs
        active={status}
        items={["OPEN", "RESOLVED", "DISMISSED"].map((s) => ({ key: s, href: `/admin/sikayetler?status=${s}`, label: REPORT_STATUS[s]!, count: counts.find((c) => c.status === s)?._count._all ?? 0 }))}
      />
      <Panel title="Elan şikayətləri">
        <Table head={["Hədəf", "Səbəb", "Şikayətçi", "Status", "Əməliyyatlar"]} empty={reports.length === 0}>
          {reports.map((r) => {
            const title = r.listing?.translations[0]?.title ?? r.roommateAd?.title ?? "Silinmiş elan";
            const href = r.listing ? `/az/listings/${r.listing.id}` : r.roommateAd ? `/az/roommates/${r.roommateAd.id}` : null;
            return (
              <tr key={r.id}>
                <td className="w-[30%]">
                  {href ? (
                    <a href={href} target="_blank" rel="noreferrer" className="font-semibold hover:text-brand">
                      {title}
                    </a>
                  ) : (
                    <span className="font-semibold">{title}</span>
                  )}
                  {r.reportedUser && (
                    <p className="text-ink-2">
                      Sahibi: {r.reportedUser.name} ({r.reportedUser.email}){r.reportedUser.status === "SUSPENDED" && " — dayandırılıb"}
                    </p>
                  )}
                  <p className="text-xs text-ink-3">{fmtDate(r.createdAt)}</p>
                </td>
                <td>
                  <p className="font-medium">{REPORT_REASON_AZ[r.reason]}</p>
                  {r.details && <p className="mt-1 max-w-64 text-ink-2">{r.details}</p>}
                </td>
                <td className="text-ink-2">{r.reporter ? `${r.reporter.name}` : "—"}</td>
                <td>
                  <StatusPill status={r.status} label={REPORT_STATUS[r.status]} />
                  {r.resolution && (
                    <p className="mt-1 max-w-48 text-xs text-ink-2">
                      {r.resolution} {r.resolver && `— ${r.resolver.name}`}
                    </p>
                  )}
                </td>
                <td>
                  {r.status === "OPEN" && (
                    <div className="flex flex-wrap gap-1.5">
                      <OpButton action={reportAction} id={r.id} op="resolve" label="Həll edildi" variant="primary" prompt="Görülən iş (məs. elan arxivləndi):" />
                      <OpButton action={reportAction} id={r.id} op="dismiss" label="Əsassızdır" prompt="Qısa izah:" />
                      {r.reportedUser && r.reportedUser.status === "ACTIVE" && (
                        <OpButton action={userAction} id={r.reportedUser.id} op="suspend" label="Hesabı dayandır" variant="danger" prompt="Dayandırma səbəbi:" />
                      )}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </Table>
      </Panel>
      <div id="muracietler">
        <Panel title="Əlaqə formasından müraciətlər">
          <Table head={["Göndərən", "Mövzu və mesaj", "Dil", "Status", "Əməliyyatlar"]} empty={support.length === 0}>
            {support.map((m) => (
              <tr key={m.id}>
                <td>
                  <p className="font-medium">{m.name}</p>
                  <a href={`mailto:${m.email}`} className="text-brand hover:underline">
                    {m.email}
                  </a>
                  <p className="text-xs text-ink-3">{fmtDate(m.createdAt)}</p>
                </td>
                <td className="w-[45%]">
                  <p className="font-semibold">{m.subject}</p>
                  <p className="mt-1 whitespace-pre-line text-ink-2">{m.message}</p>
                </td>
                <td className="uppercase">{m.locale}</td>
                <td>
                  <StatusPill status={m.status} label={SUPPORT_STATUS[m.status]} />
                </td>
                <td>
                  {m.status === "OPEN" && (
                    <div className="flex flex-wrap gap-1.5">
                      <OpButton action={reportAction} id={m.id} op="answered" label="Cavablandırıldı" variant="primary" />
                      <OpButton action={reportAction} id={m.id} op="closed" label="Bağla" />
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        </Panel>
      </div>
    </AdminPage>
  );
}
