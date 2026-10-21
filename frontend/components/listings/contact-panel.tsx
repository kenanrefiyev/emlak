"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Phone } from "lucide-react";
import { ActionForm, Field, FormError, FormSuccess, SubmitButton } from "@/components/forms/action-form";
import { contactAction, recordWhatsappClickAction, revealPhoneAction } from "@/app/[locale]/listings/actions";
import { formatPhone, whatsappLink } from "@/lib/format";

/** Contact request form, plus the agent's business phone behind a click (logged-in only). */
export function ContactPanel({
  target,
  canPhone,
  placeholder,
}: {
  target: { listingId?: string; roommateAdId?: string };
  canPhone: boolean;
  placeholder: string;
}) {
  const t = useTranslations("contact");
  const l = useTranslations("listing");
  const e = useTranslations("errors");
  const locale = useLocale();
  const [sent, setSent] = useState<null | { mail: boolean }>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {canPhone && target.listingId && (
        <div>
          {phone ? (
            <div className="flex flex-wrap gap-2">
              <a href={`tel:${phone}`} className="btn btn-dark flex-1">
                <Phone className="size-4" aria-hidden />
                {formatPhone(phone)}
              </a>
              {whatsappLink(phone) && (
                <a
                  href={whatsappLink(phone)!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline"
                  onClick={() => target.listingId && void recordWhatsappClickAction(target.listingId)}
                >
                  WhatsApp
                </a>
              )}
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-dark w-full"
              onClick={async () => {
                const res = await revealPhoneAction(target.listingId!);
                if (res.phone) setPhone(res.phone);
                else setPhoneError(e.has((res.error ?? "generic") as never) ? e((res.error ?? "generic") as "generic") : e("generic"));
              }}
            >
              <Phone className="size-4" aria-hidden />
              {l("showPhone")}
            </button>
          )}
          <p className="hint mt-1.5">{phoneError ?? l("phoneHint")}</p>
        </div>
      )}

      {sent ? (
        <FormSuccess message={sent.mail ? t("sent") : `${t("sent")} ${t("sentNoMail")}`} />
      ) : (
        <ActionForm action={contactAction} onSuccess={(s) => setSent({ mail: Boolean(s.status === "ok" && s.data?.emailDelivered) })} className="space-y-3">
          <input type="hidden" name="locale" value={locale} />
          {target.listingId && <input type="hidden" name="listingId" value={target.listingId} />}
          {target.roommateAdId && <input type="hidden" name="roommateAdId" value={target.roommateAdId} />}
          <FormError />
          <Field name="message" label={t("message")} required>
            {(p) => <textarea {...p} rows={5} maxLength={1000} placeholder={placeholder} className="field resize-y" />}
          </Field>
          <SubmitButton className="btn btn-primary w-full">{t("send")}</SubmitButton>
          <p className="hint">{t("privacy")}</p>
        </ActionForm>
      )}
    </div>
  );
}
