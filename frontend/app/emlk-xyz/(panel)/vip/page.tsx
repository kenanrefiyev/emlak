import { requireAdmin } from "@/server/auth/current";
import { db } from "@/server/db";
import { AdminPage, Panel, Table, fmtDate } from "@/components/admin/ui";
import { FeatureForm } from "@/components/admin/admin-forms";
import { OpButton } from "@/components/account/op-button";
import { subscriptionAction } from "@/app/emlk-xyz/actions";

export const metadata = { title: "VIP elanlar" };

export default async function AdminFeatured() {
  await requireAdmin();
  const now = new Date();
  const rows = await db.featuredListing.findMany({
    where: { endsAt: { gt: now } },
    orderBy: { endsAt: "asc" },
    include: {
      listing: { select: { id: true, status: true, translations: { where: { isOriginal: true }, select: { title: true } }, owner: { select: { name: true } } } },
      createdBy: { select: { name: true } },
    },
  });
  return (
    <AdminPage title="VIP elanlar" lead="VIP elanlar axtarış səhifəsinin yuxarısında ayrıca blokda göstərilir. Yalnız dərc olunmuş elan VIP edilə bilər.">
      <Panel title="Elanı VIP et">
        <FeatureForm />
      </Panel>
      <Panel title="Aktiv VIP elanlar">
        <Table head={["Elan", "Mənbə", "Müddət", "Əməliyyatlar"]} empty={rows.length === 0}>
          {rows.map((f) => (
            <tr key={f.id}>
              <td>
                <a href={`/az/listings/${f.listing.id}`} target="_blank" rel="noreferrer" className="font-semibold hover:text-brand">
                  {f.listing.translations[0]?.title}
                </a>
                <p className="text-ink-2">{f.listing.owner.name}</p>
              </td>
              <td>{f.source === "SUBSCRIPTION" ? "Makler paketi" : `Admin${f.createdBy ? ` (${f.createdBy.name})` : ""}`}</td>
              <td className="text-ink-2">
                {fmtDate(f.startsAt)} — {fmtDate(f.endsAt)}
              </td>
              <td>
                <OpButton action={subscriptionAction} id={f.id} op="endFeatured" label="VIP-i bitir" variant="danger" confirm="VIP indi bitirilsin?" />
              </td>
            </tr>
          ))}
        </Table>
      </Panel>
    </AdminPage>
  );
}
