import { requireAdmin } from "@/server/auth/current";
import { adminPlaceOptions } from "@/server/admin";
import { db } from "@/server/db";
import { AdminPage, Panel } from "@/components/admin/ui";
import { ReferenceForm } from "@/components/admin/reference-form";
import { OpButton } from "@/components/account/op-button";
import { referenceAction } from "@/app/admin/actions";

export const metadata = { title: "Universitetlər" };

export default async function AdminUniversities() {
  await requireAdmin();
  const [unis, places, metros] = await Promise.all([
    db.university.findMany({ orderBy: { shortName: "asc" }, include: { _count: { select: { listings: true } }, nearestMetro: { select: { nameAz: true } } } }),
    adminPlaceOptions(),
    db.metroStation.findMany({ orderBy: { nameAz: "asc" }, select: { id: true, nameAz: true } }),
  ]);
  const fields = [
    { name: "shortName", label: "Qısa ad", type: "text" as const, required: true },
    { name: "cityId", label: "Şəhər", type: "select" as const, required: true, options: places.cities },
    { name: "districtId", label: "Rayon", type: "select" as const, options: places.districts },
    { name: "nearestMetroId", label: "Yaxın metro", type: "select" as const, options: metros.map((m) => ({ value: m.id, label: m.nameAz })) },
    { name: "latitude", label: "En dairəsi", type: "number" as const },
    { name: "longitude", label: "Uzunluq", type: "number" as const },
  ];
  return (
    <AdminPage title="Universitetlər" lead="Yaxın metro yalnız dəqiq bilinəndə qeyd olunmalıdır — saytda məsafə iddiası kimi göstərilir.">
      <Panel title="Yeni universitet">
        <ReferenceForm kind="university" fields={fields} />
      </Panel>
      {unis.map((u) => (
        <Panel key={u.id}>
          <details>
            <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3">
              <span className="t-h5">
                {u.shortName} <span className="text-sm font-normal text-ink-2">{u.nameAz} · {u.nearestMetro?.nameAz ?? "metro qeyd olunmayıb"} · {u._count.listings} elan</span>
              </span>
              <span className="text-sm font-semibold text-brand">Redaktə et</span>
            </summary>
            <div className="mt-5 space-y-4">
              <ReferenceForm kind="university" id={u.id} values={u} fields={fields} />
              <OpButton action={referenceAction} id={u.id} op="delete" extra={{ kind: "university" }} label="Sil" variant="danger" confirm="Universitet silinsin?" />
            </div>
          </details>
        </Panel>
      ))}
    </AdminPage>
  );
}
