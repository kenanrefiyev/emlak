import type { Prisma } from "@/generated/prisma/client";
import { requireAdmin } from "@/server/auth/current";
import { db } from "@/server/db";
import { AdminPage, Panel, ROLE_AZ, StatusPill, Table, Tabs, fmtDate } from "@/components/admin/ui";
import { OpButton } from "@/components/account/op-button";
import { userAction } from "@/app/emlk-xyz/actions";

export const metadata = { title: "İstifadəçilər" };

const PER = 30;

export default async function AdminUsers({ searchParams }: { searchParams: Promise<{ role?: string; q?: string; page?: string }> }) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const role = ["USER", "OWNER", "AGENT", "ADMIN"].includes(sp.role ?? "") ? sp.role! : "ALL";
  const q = sp.q?.trim().slice(0, 80);
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.UserWhereInput = {
    ...(role !== "ALL" ? { role: role as never } : {}),
    ...(q ? { OR: [{ email: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }] } : {}),
  };
  const [total, users, counts] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER,
      take: PER,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        suspendedReason: true,
        emailVerifiedAt: true,
        createdAt: true,
        lastLoginAt: true,
        _count: { select: { listings: true, roommateAds: true, reportsAgainst: true } },
      },
    }),
    db.user.groupBy({ by: ["role"], _count: { _all: true } }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PER));
  return (
    <AdminPage title="İstifadəçilər" lead="Administrator rolu yalnız serverdə `npm run admin:create` əmri ilə verilir; buradan verilə bilməz.">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Tabs
          active={role}
          items={[
            { key: "ALL", href: "/emlk-xyz/istifadeciler", label: "Hamısı" },
            ...(["USER", "OWNER", "AGENT", "ADMIN"] as const).map((r) => ({ key: r, href: `/emlk-xyz/istifadeciler?role=${r}`, label: ROLE_AZ[r]!, count: counts.find((c) => c.role === r)?._count._all ?? 0 })),
          ]}
        />
        <form className="flex gap-2" action="/emlk-xyz/istifadeciler">
          <input type="hidden" name="role" value={role === "ALL" ? "" : role} />
          <label htmlFor="uq" className="sr-only">
            Axtarış
          </label>
          <input id="uq" name="q" defaultValue={q} placeholder="Ad, e-poçt, telefon" className="field !min-h-11 w-72" />
          <button className="btn btn-primary btn-sm !min-h-11">Axtar</button>
        </form>
      </div>
      <Panel>
        <Table head={["İstifadəçi", "Rol", "Fəaliyyət", "Status", "Əməliyyatlar"]} empty={users.length === 0}>
          {users.map((u) => (
            <tr key={u.id}>
              <td>
                <p className="font-semibold">{u.name}</p>
                <p className="text-ink-2">{u.email}</p>
                <p className="text-xs text-ink-3">
                  {u.phone ?? "telefon yoxdur"} · {u.emailVerifiedAt ? "e-poçt təsdiqli" : "e-poçt təsdiqsiz"}
                </p>
              </td>
              <td>{ROLE_AZ[u.role]}</td>
              <td className="text-ink-2">
                <p>
                  {u._count.listings} kirayə · {u._count.roommateAds} ev yoldaşı elanı
                </p>
                {u._count.reportsAgainst > 0 && <p className="text-danger">{u._count.reportsAgainst} şikayət</p>}
                <p className="text-xs text-ink-3">
                  Qeydiyyat {fmtDate(u.createdAt)} · son giriş {fmtDate(u.lastLoginAt)}
                </p>
              </td>
              <td>
                <StatusPill status={u.status} label={u.status === "ACTIVE" ? "Aktiv" : "Dayandırılıb"} />
                {u.suspendedReason && <p className="mt-1 max-w-48 text-xs text-ink-2">{u.suspendedReason}</p>}
              </td>
              <td>
                {u.role !== "ADMIN" && u.id !== admin.id && (
                  <div className="flex max-w-xs flex-wrap gap-1.5">
                    {u.status === "ACTIVE" ? (
                      <OpButton action={userAction} id={u.id} op="suspend" label="Dayandır" variant="danger" prompt="Dayandırma səbəbi (audit jurnalına yazılır):" />
                    ) : (
                      <OpButton action={userAction} id={u.id} op="unsuspend" label="Bərpa et" variant="primary" />
                    )}
                    {(["USER", "OWNER", "AGENT"] as const)
                      .filter((r) => r !== u.role)
                      .map((r) => (
                        <OpButton key={r} action={userAction} id={u.id} op="role" extra={{ role: r }} label={`→ ${ROLE_AZ[r]}`} confirm={`Rol "${ROLE_AZ[r]}" olaraq dəyişdirilsin?`} />
                      ))}
                  </div>
                )}
              </td>
            </tr>
          ))}
        </Table>
        {pages > 1 && (
          <nav aria-label="Səhifələr" className="mt-6 flex flex-wrap gap-2">
            {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
              <a key={p} href={`/emlk-xyz/istifadeciler?${new URLSearchParams({ ...(role !== "ALL" ? { role } : {}), ...(q ? { q } : {}), page: String(p) })}`} aria-current={p === page ? "page" : undefined} className="grid size-10 place-items-center rounded-full border border-line text-sm aria-[current=page]:bg-brand aria-[current=page]:text-white">
                {p}
              </a>
            ))}
          </nav>
        )}
      </Panel>
    </AdminPage>
  );
}
