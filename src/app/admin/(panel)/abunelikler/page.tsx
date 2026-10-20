import { requireAdmin } from "@/server/auth/current";
import { db } from "@/server/db";
import { AdminPage, Panel, StatusPill, SUB_STATUS_AZ, Table, fmtDate } from "@/components/admin/ui";
import { PackageForm } from "@/components/admin/admin-forms";
import { OpButton } from "@/components/account/op-button";
import { subscriptionAction } from "@/app/admin/actions";

export const metadata = { title: "Abunəliklər" };

export default async function AdminSubscriptions() {
  await requireAdmin();
  const [packages, subs] = await Promise.all([
    db.subscriptionPackage.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { subscriptions: { where: { status: "ACTIVE" } } } } } }),
    db.subscription.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 100,
      include: { user: { select: { name: true, email: true, agentProfile: { select: { companyName: true, businessPhone: true } } } }, package: true },
    }),
  ]);
  return (
    <AdminPage
      title="Abunəliklər"
      lead="Onlayn ödəniş qoşulmayıb: makler paket seçir, ödəniş kənarda təsdiqlənir, sonra paketi burada aktivləşdirirsiniz. Yeni paket əvvəlki aktiv paketi əvəz edir."
    >
      <Panel title="Paket sorğuları və aktiv paketlər">
        <Table head={["Makler", "Paket", "Status", "Müddət", "Əməliyyatlar"]} empty={subs.length === 0}>
          {subs.map((s) => (
            <tr key={s.id}>
              <td>
                <p className="font-semibold">{s.user.agentProfile?.companyName ?? s.user.name}</p>
                <p className="text-ink-2">{s.user.email}</p>
                <p className="text-xs text-ink-3">{s.user.agentProfile?.businessPhone}</p>
              </td>
              <td>
                {s.package.nameAz} — {s.package.priceAzn} ₼ / {s.package.durationDays} gün
              </td>
              <td>
                <StatusPill status={s.status} label={SUB_STATUS_AZ[s.status]} />
              </td>
              <td className="text-ink-2">
                {s.startsAt ? `${fmtDate(s.startsAt)} — ${fmtDate(s.endsAt)}` : `Sorğu: ${fmtDate(s.createdAt)}`}
                {s.note && <p className="text-xs">{s.note}</p>}
              </td>
              <td>
                <div className="flex flex-wrap gap-1.5">
                  {s.status === "REQUESTED" && (
                    <OpButton action={subscriptionAction} id={s.id} op="activate" label="Ödəniş alındı — aktivləşdir" variant="primary" prompt="Ödəniş qeydi (məs. qəbz nömrəsi), istəyə bağlı:" />
                  )}
                  {(s.status === "REQUESTED" || s.status === "ACTIVE") && (
                    <OpButton action={subscriptionAction} id={s.id} op="cancel" label="Ləğv et" variant="danger" confirm="Abunəlik ləğv edilsin?" />
                  )}
                </div>
              </td>
            </tr>
          ))}
        </Table>
      </Panel>
      <Panel title="Yeni paket">
        <PackageForm />
      </Panel>
      {packages.map((p) => (
        <Panel key={p.id}>
          <details>
            <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3">
              <span className="t-h5">
                {p.nameAz}{" "}
                <span className="text-sm font-normal text-ink-2">
                  {p.priceAzn} ₼ · {p.listingLimit} elan · {p.featuredSlots} VIP · {p._count.subscriptions} aktiv abunəçi {p.isActive ? "" : "· deaktiv"}
                </span>
              </span>
              <span className="text-sm font-semibold text-brand">Redaktə et</span>
            </summary>
            <div className="mt-5">
              <PackageForm values={p} />
            </div>
          </details>
        </Panel>
      ))}
    </AdminPage>
  );
}
