import { requireAdmin } from "@/server/auth/current";
import { db } from "@/server/db";
import { daysFromNow } from "@/lib/time";
import { AdminPage, CATEGORY_AZ, LISTING_STATUS_AZ, Panel, ROLE_AZ } from "@/components/admin/ui";

export const metadata = { title: "Statistika" };

function Bars({ rows }: { rows: { label: string; value: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[12rem_1fr_3rem] items-center gap-3 text-sm">
          <span className="truncate text-ink-2">{r.label}</span>
          <span className="h-2.5 overflow-hidden rounded-full bg-gray">
            <span className="block h-full rounded-full bg-brand" style={{ width: `${(r.value / max) * 100}%` }} />
          </span>
          <span className="text-right font-semibold tabular-nums">{r.value}</span>
        </li>
      ))}
    </ul>
  );
}

/** Platform numbers computed directly from the database (no estimates). */
export default async function AdminStats() {
  await requireAdmin();
  const since30 = daysFromNow(-30);
  const [byStatus, byCategory, byRole, byDistrict, districts, events, newUsers, newListings, requests, roommates] = await Promise.all([
    db.listing.groupBy({ by: ["status"], _count: { _all: true } }),
    db.listing.groupBy({ by: ["category"], where: { status: "PUBLISHED" }, _count: { _all: true } }),
    db.user.groupBy({ by: ["role"], _count: { _all: true } }),
    db.listing.groupBy({ by: ["districtId"], where: { status: "PUBLISHED" }, _count: { _all: true } }),
    db.district.findMany({ select: { id: true, nameAz: true } }),
    db.listingEvent.groupBy({ by: ["type"], where: { createdAt: { gte: since30 } }, _count: { _all: true } }),
    db.user.count({ where: { createdAt: { gte: since30 } } }),
    db.listing.count({ where: { createdAt: { gte: since30 } } }),
    db.contactRequest.groupBy({ by: ["status"], where: { createdAt: { gte: since30 } }, _count: { _all: true } }),
    db.roommateAd.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const ev = (t: string) => events.find((e) => e.type === t)?._count._all ?? 0;
  const tiles = [
    { label: "Yeni istifadəçi (30 gün)", value: newUsers },
    { label: "Yeni elan (30 gün)", value: newListings },
    { label: "Elan baxışı (30 gün)", value: ev("VIEW") },
    { label: "Əlaqə sorğusu (30 gün)", value: requests.reduce((a, r) => a + r._count._all, 0) },
  ];
  return (
    <AdminPage title="Statistika" lead="Bütün rəqəmlər verilənlər bazasındakı real qeydlərdən hesablanır. Demo elanlar da daxildir.">
      <ul className="grid gap-[30px] sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map((t) => (
          <li key={t.label} className="rounded-xl bg-paper p-6">
            <p className="font-semibold">{t.label}</p>
            <p className="t-price mt-1 text-3xl">{t.value}</p>
          </li>
        ))}
      </ul>
      <div className="grid gap-[30px] xl:grid-cols-2">
        <Panel title="Elanlar statusa görə">
          <Bars rows={byStatus.map((s) => ({ label: LISTING_STATUS_AZ[s.status] ?? s.status, value: s._count._all }))} />
        </Panel>
        <Panel title="Dərc olunmuş elanlar növə görə">
          <Bars rows={byCategory.map((s) => ({ label: CATEGORY_AZ[s.category] ?? s.category, value: s._count._all }))} />
        </Panel>
        <Panel title="Dərc olunmuş elanlar rayona görə">
          <Bars rows={byDistrict.map((d) => ({ label: districts.find((x) => x.id === d.districtId)?.nameAz ?? "—", value: d._count._all })).sort((a, b) => b.value - a.value)} />
        </Panel>
        <Panel title="İstifadəçilər rola görə">
          <Bars rows={byRole.map((r) => ({ label: ROLE_AZ[r.role] ?? r.role, value: r._count._all }))} />
        </Panel>
        <Panel title="Ev yoldaşı elanları">
          <Bars rows={roommates.map((r) => ({ label: LISTING_STATUS_AZ[r.status] ?? r.status, value: r._count._all }))} />
        </Panel>
        <Panel title="Elan hadisələri (30 gün)">
          <Bars
            rows={[
              { label: "Baxış", value: ev("VIEW") },
              { label: "Seçilmişlərə əlavə", value: ev("SAVE") },
              { label: "Əlaqə sorğusu", value: ev("CONTACT_REQUEST") },
              { label: "Nömrəyə baxış", value: ev("PHONE_REVEAL") },
            ]}
          />
        </Panel>
      </div>
    </AdminPage>
  );
}
