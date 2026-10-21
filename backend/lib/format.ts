import { localeTags, type AppLocale } from "@/i18n/routing";

/** AZN amounts are whole manats; the ₼ sign follows the number in every locale. */
export function formatAzn(amount: number, locale: AppLocale): string {
  return `${new Intl.NumberFormat(localeTags[locale], { maximumFractionDigits: 0 }).format(amount)} ₼`;
}

export function formatDate(date: Date | string, locale: AppLocale, opts?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(localeTags[locale], {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Baku",
    ...opts,
  }).format(d);
}

export function formatShortDate(date: Date | string, locale: AppLocale): string {
  return formatDate(date, locale, { day: "numeric", month: "short", year: undefined });
}

/** yyyy-mm-dd in Baku time, for <input type="date"> values. */
export function isoDay(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Baku" }).format(date);
}

export function daysBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/** wa.me link from a validated +994 number; null when there is no valid number. */
export function whatsappLink(phone: string | null | undefined, text?: string): string | null {
  if (!phone || !/^\+994\d{9}$/.test(phone)) return null;
  const qs = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${phone.slice(1)}${qs}`;
}

export function formatPhone(phone: string): string {
  const m = /^\+994(\d{2})(\d{3})(\d{2})(\d{2})$/.exec(phone);
  return m ? `+994 ${m[1]} ${m[2]} ${m[3]} ${m[4]}` : phone;
}
