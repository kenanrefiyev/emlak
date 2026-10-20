"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { CalendarClock, Lock, Mail, MessageCircle, Phone } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ActionForm, Field, FormError, SubmitButton } from "@/components/forms/action-form";
import { OpButton } from "@/components/account/op-button";
import { respondContactAction } from "@/app/[locale]/account/actions";
import { updateLeadAction } from "@/app/[locale]/dashboard/actions";
import { formatPhone, whatsappLink } from "@/lib/format";
import { LeadBadge } from "./lead-badge";

export interface LeadItemData {
  id: string;
  message: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED";
  leadStatus: string;
  ownerNote: string | null;
  /** yyyy-mm-ddThh:mm in Baku time, for the datetime-local input */
  viewingLocal: string | null;
  /** Formatted on the server so SSR and hydration agree. */
  createdLabel: string;
  viewingLabel: string | null;
  unread: boolean;
  name: string;
  contact: { email: string; phone: string | null } | null;
  listing: { id: string; title: string; image: string | null } | null;
}

const LEADS = ["NEW", "CONTACTED", "VIEWING_SCHEDULED", "COMPLETED", "CLOSED"] as const;

export function LeadItem({ lead }: { lead: LeadItemData }) {
  const t = useTranslations("dashboard.inquiries");
  const ls = useTranslations("dashboard.leadStatus");
  const e = useTranslations("enums");
  const [leadStatus, setLeadStatus] = useState(lead.leadStatus);
  const [open, setOpen] = useState(false);
  const tone = { PENDING: "bg-warn-soft text-warn", ACCEPTED: "bg-ok-soft text-ok", DECLINED: "bg-gray text-ink-3" }[lead.status];

  return (
    <li className={`rounded-xl border p-4 sm:p-5 ${lead.unread ? "border-brand/40 bg-brand-soft/30" : "border-line"}`}>
      <div className="flex flex-wrap items-start gap-3">
        {lead.listing && (
          <Link href={`/listings/${lead.listing.id}`} className="relative hidden size-14 shrink-0 overflow-hidden rounded-lg bg-mist sm:block" tabIndex={-1} aria-hidden>
            {lead.listing.image && <Image src={lead.listing.image} alt="" fill sizes="56px" className="object-cover" />}
          </Link>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {lead.unread && <span className="size-2 rounded-full bg-brand" role="img" aria-label={t("unread")} />}
            <span className="font-semibold">{lead.name}</span>
            <LeadBadge status={leadStatus} />
            <span className={`tag ${tone}`}>{e(`requestStatus.${lead.status}`)}</span>
            <span className="ml-auto text-xs text-ink-3">{lead.createdLabel}</span>
          </div>
          {lead.listing && (
            <Link href={`/listings/${lead.listing.id}`} className="mt-0.5 block truncate text-sm text-ink-2 hover:underline">
              {lead.listing.title}
            </Link>
          )}
        </div>
      </div>

      <p className="mt-3 rounded-xl bg-mist px-4 py-3 text-[0.9375rem] whitespace-pre-line">{lead.message}</p>

      {lead.contact ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {lead.contact.phone && (
            <a href={`tel:${lead.contact.phone}`} className="btn btn-outline btn-sm">
              <Phone className="size-4" aria-hidden /> {formatPhone(lead.contact.phone)}
            </a>
          )}
          {lead.contact.phone && whatsappLink(lead.contact.phone) && (
            <a href={whatsappLink(lead.contact.phone)!} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">
              <MessageCircle className="size-4" aria-hidden /> WhatsApp
            </a>
          )}
          <a href={`mailto:${lead.contact.email}`} className="btn btn-outline btn-sm">
            <Mail className="size-4" aria-hidden /> {lead.contact.email}
          </a>
          {!lead.contact.phone && <p className="self-center text-sm text-ink-3">{t("noPhone")}</p>}
        </div>
      ) : lead.status === "PENDING" ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <OpButton action={respondContactAction} id={lead.id} op="respond" extra={{ decision: "accept" }} label={t("accept")} variant="primary" />
          <OpButton action={respondContactAction} id={lead.id} op="respond" extra={{ decision: "decline" }} label={t("decline")} confirm={t("confirmDecline")} />
          <p className="flex items-center gap-1 text-xs text-ink-3">
            <Lock className="size-3.5" aria-hidden /> {t("contactAfterAccept")}
          </p>
        </div>
      ) : null}

      {lead.viewingLabel && leadStatus === "VIEWING_SCHEDULED" && (
        <p className="mt-3 flex items-center gap-2 text-sm font-medium">
          <CalendarClock className="size-4 text-warn" aria-hidden />
          {t("viewingOn", { date: lead.viewingLabel })}
        </p>
      )}
      {lead.ownerNote && !open && <p className="mt-3 border-l-2 border-line-strong pl-3 text-sm whitespace-pre-line text-ink-2">{lead.ownerNote}</p>}

      <div className="mt-3">
        <button type="button" className="min-h-9 text-sm font-semibold text-brand hover:underline" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          {open ? t("closeTracking") : t("openTracking")}
        </button>
      </div>
      {open && (
        <ActionForm action={updateLeadAction} successMessage={t("saved")} className="mt-3 grid gap-4 rounded-xl border border-line p-4 sm:grid-cols-2">
          <input type="hidden" name="id" value={lead.id} />
          <div className="sm:col-span-2">
            <FormError />
          </div>
          <Field name="leadStatus" label={t("stage")}>
            {(p) => (
              <select {...p} value={leadStatus} onChange={(ev) => setLeadStatus(ev.target.value)} className="field">
                {LEADS.map((s) => (
                  <option key={s} value={s}>
                    {ls(s)}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field name="viewingAt" label={t("viewingAt")} required={leadStatus === "VIEWING_SCHEDULED"} hint={t("viewingHint")}>
            {(p) => <input {...p} type="datetime-local" defaultValue={lead.viewingLocal ?? ""} className="field" />}
          </Field>
          <Field name="ownerNote" label={t("note")} hint={t("noteHint")} className="sm:col-span-2">
            {(p) => <textarea {...p} rows={3} maxLength={2000} defaultValue={lead.ownerNote ?? ""} className="field" />}
          </Field>
          <div className="sm:col-span-2">
            <SubmitButton className="btn btn-primary btn-sm">{t("saveTracking")}</SubmitButton>
          </div>
        </ActionForm>
      )}
    </li>
  );
}
