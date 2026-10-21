import { requireAdmin } from "@/server/auth/current";
import { db } from "@/server/db";
import { AdminPage, LINE_AZ, Panel } from "@/components/admin/ui";
import { ReferenceForm } from "@/components/admin/reference-form";
import { OpButton } from "@/components/account/op-button";
import { referenceAction } from "@/app/admin/actions";

export const metadata = { title: "Metro stansiyaları" };

export default async function AdminMetro() {
  await requireAdmin();
  const [stations, districts] = await Promise.all([
    db.metroStation.findMany({ orderBy: [{ line: "asc" }, { nameAz: "asc" }], include: { _count: { select: { listings: true } } } }),
    db.district.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, nameAz: true } }),
  ]);
  const fields = [
    { name: "line", label: "Xətt", type: "select" as const, required: true, options: Object.entries(LINE_AZ).map(([value, label]) => ({ value, label })) },
    { name: "districtId", label: "Rayon", type: "select" as const, options: districts.map((d) => ({ value: d.id, label: d.nameAz })) },
    { name: "latitude", label: "En dairəsi", type: "number" as const },
    { name: "longitude", label: "Uzunluq", type: "number" as const },
  ];
  return (
    <AdminPage title="Metro stansiyaları" lead="Bakı metrosunun stansiyaları. Stansiyanın rayonu bilinmirsə boş saxlayın.">
      <Panel title="Yeni stansiya">
        <ReferenceForm kind="metro" fields={fields} />
      </Panel>
      {stations.map((s) => (
        <Panel key={s.id}>
          <details>
            <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3">
              <span className="t-h5">
                {s.nameAz} <span className="text-sm font-normal text-ink-2">{LINE_AZ[s.line]} · {s._count.listings} elan</span>
              </span>
              <span className="text-sm font-semibold text-brand">Redaktə et</span>
            </summary>
            <div className="mt-5 space-y-4">
              <ReferenceForm kind="metro" id={s.id} values={s} fields={fields} />
              <OpButton action={referenceAction} id={s.id} op="delete" extra={{ kind: "metro" }} label="Sil" variant="danger" confirm="Stansiya silinsin? Elanlarda boş qalacaq." />
            </div>
          </details>
        </Panel>
      ))}
    </AdminPage>
  );
}
