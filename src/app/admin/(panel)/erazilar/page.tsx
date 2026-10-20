import { requireAdmin } from "@/server/auth/current";
import { db } from "@/server/db";
import { AdminPage, Panel } from "@/components/admin/ui";
import { ReferenceForm } from "@/components/admin/reference-form";
import { OpButton } from "@/components/account/op-button";
import { referenceAction } from "@/app/admin/actions";

export const metadata = { title: "Ərazilər" };

export default async function AdminAreas() {
  await requireAdmin();
  const [districts, listingCounts] = await Promise.all([
    db.district.findMany({ orderBy: { sortOrder: "asc" }, include: { neighborhoods: { orderBy: { nameAz: "asc" } } } }),
    db.listing.groupBy({ by: ["districtId"], _count: { _all: true } }),
  ]);
  const districtOptions = districts.map((d) => ({ value: d.id, label: d.nameAz }));
  const nbFields = [
    { name: "districtId", label: "Rayon", type: "select" as const, options: districtOptions, required: true },
    { name: "isPopular", label: "Ana səhifədə populyar", type: "checkbox" as const },
    { name: "latitude", label: "En dairəsi", type: "number" as const },
    { name: "longitude", label: "Uzunluq", type: "number" as const },
  ];
  return (
    <AdminPage title="Ərazilər" lead="Rayonlar və məhəllələr. Elanlarda istifadə olunan rayon silinə bilməz. Koordinatlar istəyə bağlıdır — məsafə hesablanmır.">
      <Panel title="Yeni rayon">
        <ReferenceForm kind="district" fields={[{ name: "sortOrder", label: "Sıra", type: "number" }]} />
      </Panel>
      <Panel title="Yeni məhəllə">
        <ReferenceForm kind="neighborhood" fields={nbFields} />
      </Panel>
      {districts.map((d) => (
        <Panel key={d.id}>
          <details>
            <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3">
              <span className="t-h5">
                {d.nameAz} <span className="text-sm font-normal text-ink-2">/{d.slug} · {d.neighborhoods.length} məhəllə · {listingCounts.find((c) => c.districtId === d.id)?._count._all ?? 0} elan</span>
              </span>
              <span className="text-sm font-semibold text-brand">Redaktə et</span>
            </summary>
            <div className="mt-5 space-y-6">
              <ReferenceForm kind="district" id={d.id} values={d} fields={[{ name: "sortOrder", label: "Sıra", type: "number" }]} />
              <OpButton action={referenceAction} id={d.id} op="delete" extra={{ kind: "district" }} label="Rayonu sil" variant="danger" confirm="Rayon silinsin?" />
              <div className="space-y-5 border-t border-line pt-5">
                {d.neighborhoods.map((n) => (
                  <div key={n.id} className="rounded-xl border border-line p-4">
                    <p className="mb-3 font-semibold">
                      {n.nameAz} <span className="text-sm font-normal text-ink-2">/{n.slug}</span>
                    </p>
                    <ReferenceForm kind="neighborhood" id={n.id} values={n} fields={nbFields} />
                    <div className="mt-3">
                      <OpButton action={referenceAction} id={n.id} op="delete" extra={{ kind: "neighborhood" }} label="Məhəlləni sil" variant="danger" confirm="Məhəllə silinsin? Elanlarda məhəllə boş qalacaq." />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </details>
        </Panel>
      ))}
    </AdminPage>
  );
}
