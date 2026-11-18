import { requireAdmin } from "@/server/auth/current";
import { db } from "@/server/db";
import { AdminPage, Panel, Table, fmtDate } from "@/components/admin/ui";

export const metadata = { title: "Audit jurnalı" };

const PER = 50;
const ACTION_AZ: Record<string, string> = {
  "listing.approve": "Elan təsdiqləndi",
  "listing.reject": "Elan rədd edildi",
  "listing.verify": "Elan yoxlanılmış edildi",
  "listing.unverify": "Yoxlanılıb nişanı silindi",
  "listing.archived": "Elan arxivləndi",
  "listing.delete": "Elan silindi",
  "listing.edit": "Elan redaktə edildi",
  "roommate.approve": "Ev yoldaşı elanı təsdiqləndi",
  "roommate.reject": "Ev yoldaşı elanı rədd edildi",
  "roommate.delete": "Ev yoldaşı elanı silindi",
  "user.suspend": "Hesab dayandırıldı",
  "user.unsuspend": "Hesab bərpa edildi",
  "user.role": "Rol dəyişdirildi",
  "agent.verify": "Makler təsdiqləndi",
  "agent.reject": "Makler sorğusu rədd edildi",
  "agent.revoke": "Makler təsdiqi ləğv edildi",
  "report.resolved": "Şikayət həll edildi",
  "report.dismissed": "Şikayət rədd edildi",
  "subscription.activate": "Paket aktivləşdirildi",
  "subscription.cancel": "Paket ləğv edildi",
  "featured.add": "VIP əlavə edildi",
  "featured.end": "VIP bitirildi",
  "settings.update": "Tənzimləmələr dəyişdirildi",
  "package.create": "Paket yaradıldı",
  "package.update": "Paket dəyişdirildi",
};

export default async function AdminAudit({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireAdmin();
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const [total, rows] = await Promise.all([
    db.auditLog.count(),
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, skip: (page - 1) * PER, take: PER, include: { actor: { select: { name: true, email: true } } } }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PER));
  return (
    <AdminPage title="Audit jurnalı" lead="Həssas inzibati əməliyyatların qeydi. Qeydlər silinmir.">
      <Panel>
        <Table head={["Vaxt", "İcraçı", "Əməliyyat", "Obyekt", "Təfərrüat"]} empty={rows.length === 0}>
          {rows.map((r) => (
            <tr key={String(r.id)}>
              <td className="whitespace-nowrap text-ink-2">{fmtDate(r.createdAt)}</td>
              <td>{r.actor ? `${r.actor.name}` : "Sistem"}</td>
              <td className="font-medium">{ACTION_AZ[r.action] ?? r.action}</td>
              <td className="text-ink-2">
                {r.entityType}
                {r.entityId && <span className="block font-mono text-xs">{r.entityId}</span>}
              </td>
              <td className="max-w-80 font-mono text-xs break-all text-ink-2">{r.metadata ? JSON.stringify(r.metadata) : "—"}</td>
            </tr>
          ))}
        </Table>
        {pages > 1 && (
          <nav aria-label="Səhifələr" className="mt-6 flex flex-wrap gap-2">
            {Array.from({ length: Math.min(pages, 30) }, (_, i) => i + 1).map((p) => (
              <a key={p} href={`/emlk-xyz/audit?page=${p}`} aria-current={p === page ? "page" : undefined} className="grid size-10 place-items-center rounded-full border border-line text-sm aria-[current=page]:bg-brand aria-[current=page]:text-white">
                {p}
              </a>
            ))}
          </nav>
        )}
      </Panel>
    </AdminPage>
  );
}
