"use client";

import { useActionState, useState, useTransition } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { BadgeCheck, CalendarCheck, Eye, Heart, ImageOff, MessageSquare, Pencil, Star } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { ActionState } from "@/server/errors";
import { ConfirmDialog, OpButton } from "@/components/account/op-button";
import { listingOpAction } from "@/app/[locale]/account/actions";
import { featureListingAction } from "@/app/[locale]/agent/actions";
import { bulkListingAction } from "@/app/[locale]/dashboard/actions";
import { ListingStatusBadge } from "./lead-badge";
import { AvailabilitySelect } from "./availability-select";

export interface BoardItem {
  id: string;
  title: string;
  category: string;
  status: string;
  price: string;
  area: string;
  image: string | null;
  imageCount: number;
  rejectionReason: string | null;
  /** Formatted on the server so SSR and hydration agree. */
  createdLabel: string;
  expiresLabel: string | null;
  featuredUntil: string | null;
  views: number;
  saves: number;
  inquiries: number;
  isVerified: boolean;
  availability: string;
  /** Formatted on the server; null when never confirmed. */
  confirmedLabel: string | null;
  needsConfirmation: boolean;
}

type BulkOp = "submit" | "reconfirm" | "renew" | "rented" | "archive" | "delete";

/** Which single and bulk actions make sense for an owner-facing status. */
const OPS_FOR: Record<string, BulkOp[]> = {
  DRAFT: ["submit", "delete"],
  PENDING_REVIEW: ["archive", "delete"],
  ACTIVE: ["reconfirm", "rented", "renew", "archive", "delete"],
  EXPIRED: ["renew", "archive", "delete"],
  REJECTED: ["submit", "delete"],
  RENTED: ["renew", "delete"],
  ARCHIVED: ["renew", "delete"],
};

export function ListingsBoard({ items, view, bulk, canFeature }: { items: BoardItem[]; view: "cards" | "table"; bulk: boolean; canFeature: boolean }) {
  const t = useTranslations("dashboard");
  const errs = useTranslations("errors");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState<BulkOp | null>(null);
  const [state, dispatch, pending] = useActionState(bulkListingAction, { status: "idle" } as ActionState);
  const [, start] = useTransition();

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const allSelected = items.length > 0 && items.every((i) => selected.has(i.id));
  const selectedItems = items.filter((i) => selected.has(i.id));
  // A bulk action is offered when at least one selected listing allows it.
  const bulkOps = (["submit", "reconfirm", "renew", "rented", "archive", "delete"] as const).filter((op) => selectedItems.some((i) => OPS_FOR[i.status]?.includes(op)));

  const runBulk = (op: BulkOp) => {
    const fd = new FormData();
    fd.set("op", op);
    for (const id of selected) fd.append("ids", id);
    start(() => dispatch(fd));
    setSelected(new Set());
  };

  const actions = (l: BoardItem) => {
    const ops = OPS_FOR[l.status] ?? [];
    const expiredOrOff = l.status === "EXPIRED" || l.status === "RENTED" || l.status === "ARCHIVED";
    return (
      <div className="flex flex-wrap gap-1.5">
        <Link href={`/dashboard/listings/${l.id}/edit`} className="btn btn-outline btn-sm">
          <Pencil className="size-3.5" aria-hidden />
          {l.status === "REJECTED" ? t("actions.fix") : t("actions.edit")}
        </Link>
        <Link href={`/listings/${l.id}`} className="btn btn-ghost btn-sm" target="_blank">
          <Eye className="size-3.5" aria-hidden />
          {t("actions.preview")}
        </Link>
        {ops.includes("submit") && <OpButton action={listingOpAction} id={l.id} op="submit" label={t("actions.submit")} variant="primary" />}
        {ops.includes("reconfirm") && (
          <OpButton action={listingOpAction} id={l.id} op="reconfirm" label={t("actions.reconfirm")} variant={l.needsConfirmation ? "primary" : undefined} />
        )}
        {ops.includes("rented") && <OpButton action={listingOpAction} id={l.id} op="rented" label={t("actions.rented")} confirm={t("confirm.rented")} />}
        {ops.includes("renew") && <OpButton action={listingOpAction} id={l.id} op="renew" label={expiredOrOff ? t("actions.relist") : t("actions.renew")} />}
        {canFeature && l.status === "ACTIVE" && !l.featuredUntil && <OpButton action={featureListingAction} id={l.id} op="feature" label={t("actions.feature")} variant="dark" confirm={t("confirm.feature")} />}
        {ops.includes("archive") && <OpButton action={listingOpAction} id={l.id} op="archive" label={t("actions.deactivate")} confirm={t("confirm.archive")} />}
        {ops.includes("delete") && <OpButton action={listingOpAction} id={l.id} op="delete" label={t("actions.delete")} variant="danger" confirm={t("confirm.delete")} />}
      </div>
    );
  };

  const meta = (l: BoardItem) => (
    <>
      <span className="inline-flex items-center gap-1" title={t("columns.views")}>
        <Eye className="size-3.5" aria-hidden />
        <span className="sr-only">{t("columns.views")}:</span>
        {l.views}
      </span>
      <span className="inline-flex items-center gap-1" title={t("columns.saves")}>
        <Heart className="size-3.5" aria-hidden />
        <span className="sr-only">{t("columns.saves")}:</span>
        {l.saves}
      </span>
      <span className="inline-flex items-center gap-1" title={t("columns.inquiries")}>
        <MessageSquare className="size-3.5" aria-hidden />
        <span className="sr-only">{t("columns.inquiries")}:</span>
        {l.inquiries}
      </span>
    </>
  );

  /** Availability control and the last confirmation, for listings that can be live. */
  const availability = (l: BoardItem) =>
    ["ACTIVE", "PENDING_REVIEW", "DRAFT"].includes(l.status) && (
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <AvailabilitySelect id={l.id} value={l.availability} />
        {l.status === "ACTIVE" && (
          <span className={`inline-flex items-center gap-1 text-xs ${l.needsConfirmation ? "font-semibold text-warn" : "text-ink-3"}`}>
            <CalendarCheck className="size-3.5" aria-hidden />
            {l.needsConfirmation ? t("needsConfirmation") : t("confirmedOn", { date: l.confirmedLabel ?? "—" })}
          </span>
        )}
      </div>
    );

  const checkbox = (l: BoardItem) =>
    bulk && (
      <input
        type="checkbox"
        checked={selected.has(l.id)}
        onChange={() => toggle(l.id)}
        aria-label={t("select", { title: l.title })}
        className="size-5 shrink-0 cursor-pointer accent-brand"
      />
    );

  const thumb = (l: BoardItem, cls: string, sizes: string) => (
    <div className={`relative shrink-0 overflow-hidden rounded-lg bg-mist ${cls}`}>
      {l.image ? (
        <Image src={l.image} alt="" fill sizes={sizes} className="object-cover" />
      ) : (
        <span className="grid h-full place-items-center text-ink-3">
          <ImageOff className="size-5" aria-hidden />
        </span>
      )}
      {l.featuredUntil && (
        <span className="tag absolute top-2 left-2 bg-ink text-white">
          <Star className="size-3" aria-hidden /> VIP
        </span>
      )}
    </div>
  );

  return (
    <div className="mt-4">
      {bulk && (
        <div className="sticky top-[78px] z-20 -mx-2 mb-3 flex min-h-12 flex-wrap items-center gap-2 rounded-xl bg-paper/95 px-2 py-2 backdrop-blur-sm">
          <label className="flex min-h-10 cursor-pointer items-center gap-2 pr-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() => setSelected(allSelected ? new Set() : new Set(items.map((i) => i.id)))}
              className="size-5 accent-brand"
            />
            {selected.size ? t("bulk.selected", { count: selected.size }) : t("bulk.selectAll")}
          </label>
          {selected.size > 0 &&
            bulkOps.map((op) => (
              <button
                key={op}
                type="button"
                disabled={pending}
                onClick={() => (op === "delete" || op === "archive" || op === "rented" ? setConfirming(op) : runBulk(op))}
                className={`btn btn-sm ${op === "delete" ? "btn-danger" : op === "submit" ? "btn-primary" : "btn-outline"}`}
              >
                {t(`bulk.${op}`)}
              </button>
            ))}
          {state.status === "ok" && (
            <p role="status" className="basis-full text-sm font-medium text-ok sm:basis-auto">
              {t("bulk.result", { ok: Number(state.data?.ok ?? 0), failed: Number(state.data?.failed ?? 0) })}
              {Number(state.data?.failed ?? 0) > 0 && Array.isArray(state.data?.codes) && (
                <span className="ml-1 text-danger">
                  ({(state.data!.codes as string[]).map((c) => (errs.has(c as never) ? errs(c as "generic") : errs("generic"))).join(" · ")})
                </span>
              )}
            </p>
          )}
          {state.status === "error" && (
            <p role="alert" className="basis-full text-sm font-medium text-danger sm:basis-auto">
              {errs.has(state.code as never) ? errs(state.code as "generic") : errs("generic")}
            </p>
          )}
          <ConfirmDialog
            open={confirming !== null}
            message={confirming ? t(`bulk.confirm.${confirming}`, { count: selected.size }) : ""}
            confirmLabel={confirming ? t(`bulk.${confirming}`) : ""}
            danger={confirming === "delete"}
            onCancel={() => setConfirming(null)}
            onConfirm={() => {
              const op = confirming!;
              setConfirming(null);
              runBulk(op);
            }}
          />
        </div>
      )}

      {view === "table" ? (
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[56rem] text-left text-sm">
            <thead className="bg-gray text-ink-2">
              <tr>
                {bulk && <th className="w-10 px-3 py-3" />}
                <th className="px-3 py-3 font-medium">{t("columns.listing")}</th>
                <th className="px-3 py-3 font-medium">{t("columns.status")}</th>
                <th className="px-3 py-3 text-right font-medium">{t("columns.price")}</th>
                <th className="px-3 py-3 text-right font-medium">{t("columns.views")}</th>
                <th className="px-3 py-3 text-right font-medium">{t("columns.saves")}</th>
                <th className="px-3 py-3 text-right font-medium">{t("columns.inquiries")}</th>
                <th className="px-3 py-3 font-medium">{t("columns.dates")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((l) => (
                <tr key={l.id} className="border-t border-line align-top aria-selected:bg-brand-soft/50" aria-selected={selected.has(l.id)}>
                  {bulk && <td className="px-3 py-3">{checkbox(l)}</td>}
                  <td className="px-3 py-3">
                    <div className="flex gap-3">
                      {thumb(l, "h-14 w-20", "80px")}
                      <div className="min-w-0">
                        <Link href={`/dashboard/listings/${l.id}/edit`} className="line-clamp-2 font-semibold hover:text-brand">
                          {l.title}
                        </Link>
                        <p className="text-xs text-ink-2">
                          {l.category} · {l.area}
                        </p>
                        {availability(l)}
                        <div className="mt-2">{actions(l)}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <ListingStatusBadge status={l.status} />
                    {l.rejectionReason && l.status === "REJECTED" && <p className="mt-1 max-w-48 text-xs text-danger">{l.rejectionReason}</p>}
                  </td>
                  <td className="px-3 py-3 text-right font-semibold tabular-nums whitespace-nowrap">{l.price}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{l.views}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{l.saves}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{l.inquiries}</td>
                  <td className="px-3 py-3 text-xs whitespace-nowrap text-ink-2">
                    <p>{t("createdOn", { date: l.createdLabel })}</p>
                    {l.expiresLabel && <p>{t("expiresOn", { date: l.expiresLabel })}</p>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <ul className="grid gap-4 xl:grid-cols-2">
          {items.map((l) => (
            <li key={l.id} className={`flex flex-col gap-4 rounded-xl border p-3 sm:flex-row ${selected.has(l.id) ? "border-brand bg-brand-soft/40" : "border-line"}`}>
              <div className="relative">
                {thumb(l, "aspect-[4/3] w-full sm:w-40", "(min-width: 640px) 160px, 100vw")}
                {bulk && <span className="absolute top-2 right-2 grid size-8 place-items-center rounded-md bg-paper/90">{checkbox(l)}</span>}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <ListingStatusBadge status={l.status} />
                  {l.isVerified && (
                    <span className="tag bg-ok-soft text-ok">
                      <BadgeCheck className="size-3.5" aria-hidden />
                      {t("verifiedListing")}
                    </span>
                  )}
                  <span className="ml-auto flex items-center gap-3 text-sm text-ink-2 tabular-nums">{meta(l)}</span>
                </div>
                <h3 className="mt-2 line-clamp-2 font-semibold">
                  <Link href={`/dashboard/listings/${l.id}/edit`} className="hover:text-brand">
                    {l.title}
                  </Link>
                </h3>
                <p className="mt-0.5 text-sm text-ink-2">
                  <span className="font-semibold text-ink">{l.price}</span> · {l.category} · {l.area}
                </p>
                <p className="mt-0.5 text-xs text-ink-3">
                  {t("createdOn", { date: l.createdLabel })}
                  {l.expiresLabel && ` · ${t("expiresOn", { date: l.expiresLabel })}`}
                  {l.imageCount === 0 && <span className="ml-1 font-medium text-warn">· {t("noPhotos")}</span>}
                </p>
                {l.rejectionReason && l.status === "REJECTED" && <p className="mt-1 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{l.rejectionReason}</p>}
                {availability(l)}
                <div className="mt-3">{actions(l)}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
