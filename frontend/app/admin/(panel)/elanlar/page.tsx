import Image from "next/image";
import type { Prisma } from "@/generated/prisma/client";
import { requireAdmin } from "@/server/auth/current";
import { db } from "@/server/db";
import { AdminPage, AVAILABILITY_AZ, CATEGORY_AZ, Panel, StatusPill, Table, Tabs, fmtDate } from "@/components/admin/ui";
import { OpButton } from "@/components/account/op-button";
import { moderateListingAction } from "@/app/admin/actions";
import { LISTING_STATUSES } from "@/lib/domain";
import { duplicateHints } from "@/server/listings/duplicates";

export const metadata = { title: "Kirayə elanları" };

type SP = Promise<{ status?: string; q?: string; page?: string }>;
const PER = 25;

export default async function AdminListings({ searchParams }: { searchParams: SP }) {
  await requireAdmin();
  const sp = await searchParams;
  const status = (LISTING_STATUSES as readonly string[]).includes(sp.status ?? "") ? sp.status! : sp.q ? "ALL" : "PENDING_REVIEW";
  const q = sp.q?.trim().slice(0, 80);
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.ListingWhereInput = {
    ...(status !== "ALL" ? { status: status as never } : {}),
    ...(q
      ? {
          OR: [
            { id: q },
            {
              translations: {
                some: { title: { contains: q, mode: "insensitive" } },
              },
            },
            { owner: { email: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
  const [counts, total, rows] = await Promise.all([
    db.listing.groupBy({ by: ["status"], _count: { _all: true } }),
    db.listing.count({ where }),
    db.listing.findMany({
      where,
      orderBy: status === "PENDING_REVIEW" ? { submittedAt: "asc" } : { updatedAt: "desc" },
      skip: (page - 1) * PER,
      take: PER,
      select: {
        id: true,
        category: true,
        status: true,
        monthlyRent: true,
        isVerified: true,
        isDemo: true,
        availability: true,
        availabilityConfirmedAt: true,
        submittedAt: true,
        updatedAt: true,
        expiresAt: true,
        rejectionReason: true,
        translations: {
          where: { isOriginal: true },
          select: { title: true, description: true },
        },
        images: {
          take: 1,
          orderBy: { position: "asc" },
          select: { url: true },
        },
        owner: { select: { name: true, email: true, role: true } },
        district: { select: { nameAz: true } },
        _count: { select: { reports: { where: { status: "OPEN" } } } },
        featured: {
          where: { endsAt: { gt: new Date() } },
          select: { endsAt: true },
          take: 1,
        },
      },
    }),
  ]);
  const dupes = await duplicateHints(rows.map((r) => r.id));
  const countOf = (s: string) => counts.find((c) => c.status === s)?._count._all ?? 0;
  const pages = Math.max(1, Math.ceil(total / PER));

  return (
    <AdminPage title="Kirayə elanları" lead="Yoxlamadan keçməyən elan ictimai axtarışda görünmür. Rədd edəndə səbəb yazın — elan sahibi onu görəcək.">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Tabs
          active={status}
          items={[
            ...LISTING_STATUSES.map((s) => ({
              key: s,
              href: `/admin/elanlar?status=${s}`,
              label:
                s === "PENDING_REVIEW"
                  ? "Yoxlamada"
                  : s === "PUBLISHED"
                    ? "Dərc olunub"
                    : s === "DRAFT"
                      ? "Qaralama"
                      : s === "REJECTED"
                        ? "Rədd edilib"
                        : s === "RENTED"
                          ? "Kirayə verilib"
                          : "Arxivdə",
              count: countOf(s),
            })),
            { key: "ALL", href: "/admin/elanlar?status=ALL", label: "Hamısı" },
          ]}
        />
        <form className="flex gap-2" action="/admin/elanlar">
          <input type="hidden" name="status" value={status} />
          <label className="sr-only" htmlFor="q">
            Axtarış
          </label>
          <input id="q" name="q" defaultValue={q} placeholder="Başlıq, e-poçt və ya ID" className="field !min-h-11 w-72" />
          <button className="btn btn-primary btn-sm !min-h-11">Axtar</button>
        </form>
      </div>
      <Panel>
        <Table head={["Elan", "Sahibi", "Status", "Tarix", "Əməliyyatlar"]} empty={rows.length === 0}>
          {rows.map((l) => {
            const tr = l.translations[0];
            const expired = l.status === "PUBLISHED" && l.expiresAt && l.expiresAt <= new Date();
            return (
              <tr key={l.id}>
                <td className="w-[38%]">
                  <div className="flex gap-3">
                    <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-gray">
                      {l.images[0] && <Image src={l.images[0].url} alt="" fill sizes="96px" className="object-cover" />}
                    </div>
                    <div className="min-w-0">
                      <a href={`/az/listings/${l.id}`} target="_blank" rel="noreferrer" className="font-semibold hover:text-brand">
                        {tr?.title ?? "—"}
                      </a>
                      <p className="text-ink-2">
                        {CATEGORY_AZ[l.category]} · {l.district.nameAz} · {l.monthlyRent} ₼
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs text-ink-3">{tr?.description}</p>
                      <p className="mt-1 flex flex-wrap gap-1.5">
                        {l.isDemo && <span className="tag bg-gray text-ink-2">Demo</span>}
                        {l.isVerified && <span className="tag bg-ok-soft text-ok">Yoxlanılıb</span>}
                        {l.availability !== "AVAILABLE" && <span className="tag bg-warn-soft text-warn">{AVAILABILITY_AZ[l.availability]}</span>}
                        <span className="tag bg-gray text-ink-2">
                          {l.availabilityConfirmedAt ? `Təsdiq: ${fmtDate(l.availabilityConfirmedAt)}` : "Boşluq təsdiqlənməyib"}
                        </span>
                        {l.featured[0] && <span className="tag bg-brand-soft text-brand">VIP</span>}
                        {l._count.reports > 0 && <span className="tag bg-danger-soft text-danger">{l._count.reports} şikayət</span>}
                      </p>
                      {dupes.get(l.id)?.length ? (
                        <p className="mt-1 text-xs text-warn">
                          Mümkün dublikat:{" "}
                          {dupes
                            .get(l.id)!
                            .slice(0, 3)
                            .map((d, i) => (
                              <span key={d.id}>
                                {i > 0 && ", "}
                                <a href={`/admin/elanlar?q=${d.id}`} className="font-semibold underline">
                                  {d.reason === "title" ? "eyni başlıq" : "eyni şəkil"}
                                  {d.sameOwner ? " (eyni sahib)" : " (başqa sahib)"}
                                </a>
                              </span>
                            ))}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </td>
                <td>
                  <p className="font-medium">{l.owner.name}</p>
                  <p className="text-ink-2">{l.owner.email}</p>
                </td>
                <td>
                  <StatusPill status={expired ? "EXPIRED" : l.status} />
                  {l.status === "REJECTED" && l.rejectionReason && <p className="mt-1 max-w-48 text-xs text-ink-2">{l.rejectionReason}</p>}
                </td>
                <td className="whitespace-nowrap text-ink-2">{fmtDate(l.submittedAt ?? l.updatedAt)}</td>
                <td>
                  <div className="flex max-w-xs flex-wrap gap-1.5">
                    {(l.status === "PENDING_REVIEW" || l.status === "REJECTED") && (
                      <OpButton action={moderateListingAction} id={l.id} op="approve" label="Təsdiqlə" variant="primary" />
                    )}
                    {(l.status === "PENDING_REVIEW" || l.status === "PUBLISHED") && (
                      <OpButton action={moderateListingAction} id={l.id} op="reject" label="Rədd et" prompt="Rədd səbəbi (elan sahibi görəcək):" />
                    )}
                    {l.status === "PUBLISHED" && (
                      <OpButton
                        action={moderateListingAction}
                        id={l.id}
                        op={l.isVerified ? "unverify" : "verify"}
                        label={l.isVerified ? "Yoxlanılıb nişanını sil" : "Yoxlanılıb et"}
                      />
                    )}
                    {l.status === "PUBLISHED" && !l.featured[0] && (
                      <OpButton action={moderateListingAction} id={l.id} op="feature" label="VIP (7 gün)" extra={{ days: "7" }} />
                    )}
                    {l.status !== "ARCHIVED" && (
                      <OpButton action={moderateListingAction} id={l.id} op="archive" label="Arxivlə" confirm="Elan axtarışdan çıxarılsın?" />
                    )}
                    <OpButton
                      action={moderateListingAction}
                      id={l.id}
                      op="delete"
                      label="Sil"
                      variant="danger"
                      confirm="Elan və şəkilləri birdəfəlik silinəcək. Davam edilsin?"
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </Table>
        {pages > 1 && (
          <nav aria-label="Səhifələr" className="mt-6 flex flex-wrap gap-2">
            {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
              <a
                key={p}
                href={`/admin/elanlar?status=${status}${q ? `&q=${encodeURIComponent(q)}` : ""}&page=${p}`}
                aria-current={p === page ? "page" : undefined}
                className="grid size-10 place-items-center rounded-full border border-line text-sm aria-[current=page]:bg-brand aria-[current=page]:text-white"
              >
                {p}
              </a>
            ))}
          </nav>
        )}
      </Panel>
    </AdminPage>
  );
}
