import { requireAdmin } from "@/server/auth/current";
import { db } from "@/server/db";
import { AdminPage, Panel, StatusPill, Table, fmtDate } from "@/components/admin/ui";
import { OpButton } from "@/components/account/op-button";
import { verificationAction } from "@/app/admin/actions";

export const metadata = { title: "Təsdiqlənmə sorğuları" };

const STATUS: Record<string, string> = {
  PENDING: "Yoxlamada",
  APPROVED: "Təsdiqlənib",
  REJECTED: "Rədd edilib",
};

export default async function AdminVerifications() {
  await requireAdmin();
  const rows = await db.verificationRequest.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
    take: 100,
    include: {
      applicant: {
        select: {
          name: true,
          email: true,
          phone: true,
          role: true,
          createdAt: true,
          agentProfile: true,
          _count: { select: { listings: true } },
        },
      },
      reviewer: { select: { name: true } },
    },
  });
  return (
    <AdminPage
      title="Təsdiqlənmə sorğuları"
      lead="Makler: şirkət məlumatlarını (VÖEN, ofis, əlaqə) yoxlayın. Ev sahibi: mülkiyyət və ya kirayə hüququnu göstərən sənədi şəxsən yoxlayın — telefon nömrəsi kifayət deyil. Təsdiq ictimai nişan verir."
    >
      <Panel>
        <Table head={["Müraciət edən", "Məlumat", "Sorğu", "Status", "Əməliyyatlar"]} empty={rows.length === 0}>
          {rows.map((r) => {
            const p = r.applicant.agentProfile;
            return (
              <tr key={r.id}>
                <td>
                  <p className="font-semibold">{r.applicant.name}</p>
                  <p className="text-ink-2">{r.applicant.email}</p>
                  <p className="text-xs text-ink-3">
                    Qeydiyyat: {fmtDate(r.applicant.createdAt)} · {r.applicant._count.listings} elan
                  </p>
                </td>
                <td className="text-ink-2">
                  <p className="mb-1">
                    <span className={`tag ${r.applicant.role === "AGENT" ? "bg-brand-soft text-brand" : "bg-mist text-ink"}`}>
                      {r.applicant.role === "AGENT" ? "Makler" : "Ev sahibi"}
                    </span>
                  </p>
                  {r.applicant.role !== "AGENT" ? (
                    <p>Tel: {r.applicant.phone ?? "—"}</p>
                  ) : (
                    <>
                      <p className="font-medium text-ink">{p?.companyName ?? "—"}</p>
                      <p>VÖEN: {p?.licenseNumber ?? "—"}</p>
                      <p>Tel: {p?.businessPhone ?? r.applicant.phone ?? "—"}</p>
                      <p>{p?.officeAddress}</p>
                      {p?.website && (
                        <a href={p.website} target="_blank" rel="noreferrer nofollow" className="text-brand hover:underline">
                          {p.website}
                        </a>
                      )}
                    </>
                  )}
                </td>
                <td className="w-[28%]">
                  <p className="whitespace-pre-line text-ink-2">{r.message}</p>
                  <p className="mt-1 text-xs text-ink-3">{fmtDate(r.createdAt)}</p>
                </td>
                <td>
                  <StatusPill status={r.status} label={STATUS[r.status]} />
                  {r.reviewNote && <p className="mt-1 max-w-48 text-xs text-ink-2">{r.reviewNote}</p>}
                  {r.reviewer && <p className="text-xs text-ink-3">{r.reviewer.name}</p>}
                </td>
                <td>
                  {r.status === "PENDING" && (
                    <div className="flex flex-wrap gap-1.5">
                      <OpButton
                        action={verificationAction}
                        id={r.id}
                        op="approve"
                        label="Təsdiqlə"
                        variant="primary"
                        confirm={
                          r.applicant.role === "AGENT"
                            ? "Makler təsdiqlənsin? İctimai nişan veriləcək."
                            : "Ev sahibinin sənədləri yoxlanılıb? İctimai «Təsdiqlənmiş ev sahibi» nişanı veriləcək."
                        }
                      />
                      <OpButton action={verificationAction} id={r.id} op="reject" label="Rədd et" prompt="Rədd səbəbi (müraciət edənə göstərilir):" />
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </Table>
      </Panel>
    </AdminPage>
  );
}
