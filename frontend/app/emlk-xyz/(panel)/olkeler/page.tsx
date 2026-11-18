import { requireAdmin } from "@/server/auth/current";
import { db } from "@/server/db";
import { AdminPage, Panel } from "@/components/admin/ui";
import { ReferenceForm, type RefField } from "@/components/admin/reference-form";
import { OpButton } from "@/components/account/op-button";
import { referenceAction } from "@/app/emlk-xyz/actions";

export const metadata = { title: "Ölkələr və şəhərlər" };

const countryFields: RefField[] = [
  { name: "code", label: "Kod (ISO, 2 hərf)", type: "text", required: true, hint: "kiçik hərflə, məs. az, tr" },
  { name: "currency", label: "Valyuta (ISO)", type: "text", required: true, hint: "məs. AZN, TRY — yeni elanlar bu valyutada başlayır" },
  { name: "sortOrder", label: "Sıra", type: "number" },
  { name: "latitude", label: "En dairəsi", type: "number" },
  { name: "longitude", label: "Uzunluq", type: "number" },
  { name: "isActive", label: "Saytda göstərilir", type: "checkbox" },
];

export default async function AdminCountries() {
  await requireAdmin();
  const countries = await db.country.findMany({
    orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
    include: {
      cities: {
        orderBy: [{ sortOrder: "asc" }, { nameAz: "asc" }],
        include: { _count: { select: { districts: true, universities: true, metroStations: true } } },
      },
    },
  });
  const countryOptions = countries.map((c) => ({ value: c.id, label: c.nameAz }));
  const cityFields: RefField[] = [
    { name: "countryId", label: "Ölkə", type: "select", options: countryOptions, required: true },
    { name: "sortOrder", label: "Sıra", type: "number" },
    { name: "latitude", label: "En dairəsi", type: "number" },
    { name: "longitude", label: "Uzunluq", type: "number" },
    { name: "isPopular", label: "Populyar şəhər", type: "checkbox" },
  ];
  return (
    <AdminPage
      title="Ölkələr və şəhərlər"
      lead="Saytın bazarları. Ziyarətçi ölkəni başlıqdan seçir; rayonlar, metro və universitetlər şəhərə bağlıdır. Şəhəri və ya rayonu olan ölkə silinə bilməz — gizlətmək üçün “Saytda göstərilir” işarəsini götürün."
    >
      <Panel title="Yeni ölkə">
        <ReferenceForm kind="country" withSlug={false} fields={countryFields} />
      </Panel>
      <Panel title="Yeni şəhər">
        <ReferenceForm kind="city" fields={cityFields} />
      </Panel>
      {countries.map((c) => (
        <Panel key={c.id}>
          <details>
            <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3">
              <span className="t-h5">
                {c.nameAz}{" "}
                <span className="text-sm font-normal text-ink-2">
                  /{c.code} · {c.currency} · {c.cities.length} şəhər{c.isActive ? "" : " · gizli"}
                </span>
              </span>
              <span className="text-sm font-semibold text-brand">Redaktə et</span>
            </summary>
            <div className="mt-5 space-y-6">
              <ReferenceForm kind="country" id={c.id} values={c} withSlug={false} fields={countryFields} />
              <OpButton
                action={referenceAction}
                id={c.id}
                op="delete"
                extra={{ kind: "country" }}
                label="Ölkəni sil"
                variant="danger"
                confirm="Ölkə silinsin?"
              />
              <div className="space-y-5 border-t border-line pt-5">
                {c.cities.map((city) => (
                  <div key={city.id} className="rounded-xl border border-line p-4">
                    <p className="mb-3 font-semibold">
                      {city.nameAz}{" "}
                      <span className="text-sm font-normal text-ink-2">
                        /{city.slug} · {city._count.districts} rayon · {city._count.metroStations} metro · {city._count.universities} universitet
                      </span>
                    </p>
                    <ReferenceForm kind="city" id={city.id} values={city} fields={cityFields} />
                    <div className="mt-3">
                      <OpButton
                        action={referenceAction}
                        id={city.id}
                        op="delete"
                        extra={{ kind: "city" }}
                        label="Şəhəri sil"
                        variant="danger"
                        confirm="Şəhər silinsin? Rayonu, metrosu və ya universiteti olan şəhər silinmir."
                      />
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
