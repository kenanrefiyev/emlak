import { requireAdmin } from "@/server/auth/current";
import { db } from "@/server/db";
import { AdminPage, Panel, StatusPill, Table, VERIFICATION_AZ, fmtDate } from "@/components/admin/ui";
import { OpButton } from "@/components/account/op-button";
import { userAction } from "@/app/admin/actions";

export const metadata = { title: "Maklerlər" };

export default async function AdminAgents() {
  await requireAdmin();
  const agents = await db.user.findMany({
    where: { role: "AGENT" },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      createdAt: true,
      agentProfile: true,
      subscriptions: { where: { status: "ACTIVE", endsAt: { gt: new Date() } }, include: { package: { select: { nameAz: true } } }, take: 1 },
      _count: { select: { listings: { where: { status: "PUBLISHED" } } } },
    },
  });
  return (
    <AdminPage title="Maklerlər" lead="Bütün makler hesabları, təsdiq statusu və aktiv paketlər.">
      <Panel>
        <Table head={["Makler", "Şirkət", "Təsdiq", "Paket", "Əməliyyatlar"]} empty={agents.length === 0}>
          {agents.map((a) => (
            <tr key={a.id}>
              <td>
                <a href={`/az/agents/${a.id}`} target="_blank" rel="noreferrer" className="font-semibold hover:text-brand">
                  {a.name}
                </a>
                <p className="text-ink-2">{a.email}</p>
                <p className="text-xs text-ink-3">
                  {fmtDate(a.createdAt)} · {a._count.listings} aktiv elan
                </p>
              </td>
              <td className="text-ink-2">
                <p className="font-medium text-ink">{a.agentProfile?.companyName ?? "—"}</p>
                <p>VÖEN: {a.agentProfile?.licenseNumber ?? "—"}</p>
                <p>{a.agentProfile?.businessPhone ?? ""}</p>
              </td>
              <td>
                <StatusPill status={a.agentProfile?.verificationStatus ?? "NONE"} label={VERIFICATION_AZ[a.agentProfile?.verificationStatus ?? "NONE"]} />
                {a.agentProfile?.verifiedAt && <p className="mt-1 text-xs text-ink-3">{fmtDate(a.agentProfile.verifiedAt)}</p>}
              </td>
              <td className="text-ink-2">{a.subscriptions[0] ? `${a.subscriptions[0].package.nameAz} — ${fmtDate(a.subscriptions[0].endsAt)}` : "Pulsuz limit"}</td>
              <td>
                {a.agentProfile?.verificationStatus === "VERIFIED" && (
                  <OpButton action={userAction} id={a.id} op="revoke" label="Təsdiqi ləğv et" variant="danger" prompt="Ləğv səbəbi:" />
                )}
              </td>
            </tr>
          ))}
        </Table>
      </Panel>
    </AdminPage>
  );
}
