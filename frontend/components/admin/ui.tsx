// Admin-only Azerbaijani labels and small layout helpers. The admin panel is
// never translated, so these strings live in code rather than messages/*.json.

export const LISTING_STATUS_AZ: Record<string, string> = {
  DRAFT: "Qaralama",
  PENDING_REVIEW: "Yoxlamada",
  PUBLISHED: "Dərc olunub",
  REJECTED: "Rədd edilib",
  RENTED: "Kirayə verilib",
  ARCHIVED: "Arxivdə",
  CLOSED: "Bağlanıb",
  EXPIRED: "Müddəti bitib",
};

export const AVAILABILITY_AZ: Record<string, string> = {
  AVAILABLE: "Boşdur",
  TEMPORARILY_UNAVAILABLE: "Müvəqqəti əlçatan deyil",
  RESERVED: "Rezerv olunub",
};

export const CATEGORY_AZ: Record<string, string> = {
  PRIVATE_ROOM: "Ayrıca otaq",
  SHARED_APARTMENT: "Ortaq ev",
  ENTIRE_APARTMENT: "Bütöv mənzil",
  DORMITORY: "Yataqxana / hostel",
  FAMILY_APARTMENT: "Ailə mənzili",
};

export const ROLE_AZ: Record<string, string> = { USER: "Tələbə / istifadəçi", OWNER: "Ev sahibi", AGENT: "Makler", ADMIN: "Administrator" };

export const REPORT_REASON_AZ: Record<string, string> = {
  FAKE: "Saxta elan",
  SCAM: "Fırıldaqçılıq şübhəsi",
  WRONG_PRICE: "Qiymət yanlışdır",
  ALREADY_RENTED: "Artıq kirayə verilib",
  OFFENSIVE: "Təhqiramiz məzmun",
  DISCRIMINATION: "Ayrı-seçkilik",
  SPAM: "Spam / təkrar",
  OTHER: "Digər",
};

export const VERIFICATION_AZ: Record<string, string> = { NONE: "Sorğu yoxdur", PENDING: "Yoxlamada", VERIFIED: "Təsdiqlənib", REJECTED: "Rədd edilib" };
export const SUB_STATUS_AZ: Record<string, string> = { REQUESTED: "Ödəniş gözlənilir", ACTIVE: "Aktiv", EXPIRED: "Bitib", CANCELLED: "Ləğv edilib" };
export const LINE_AZ: Record<string, string> = { RED: "Qırmızı xətt", GREEN: "Yaşıl xətt", PURPLE: "Bənövşəyi xətt" };

const tone: Record<string, string> = {
  PENDING_REVIEW: "bg-pending text-white",
  PENDING: "bg-pending text-white",
  REQUESTED: "bg-pending text-white",
  OPEN: "bg-pending text-white",
  PUBLISHED: "bg-ok text-white",
  ACTIVE: "bg-ok text-white",
  VERIFIED: "bg-ok text-white",
  APPROVED: "bg-ok text-white",
  RESOLVED: "bg-ok text-white",
  ANSWERED: "bg-ok text-white",
  REJECTED: "bg-danger text-white",
  SUSPENDED: "bg-danger text-white",
  RENTED: "bg-brand text-white",
  CLOSED: "bg-brand text-white",
};

export function StatusPill({ status, label }: { status: string; label?: string }) {
  return <span className={`tag whitespace-nowrap ${tone[status] ?? "bg-gray text-ink-2"}`}>{label ?? LISTING_STATUS_AZ[status] ?? status}</span>;
}

export function AdminPage({ title, lead, actions, children }: { title: string; lead?: string; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-[30px]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="t-h2">{title}</h1>
          {lead && <p className="mt-1 max-w-3xl text-[0.9375rem] text-ink-2">{lead}</p>}
        </div>
        {actions}
      </div>
      {children}
    </div>
  );
}

export function Panel({ title, children, className = "" }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`panel ${className}`}>
      {title && <h2 className="t-h5 mb-5">{title}</h2>}
      {children}
    </section>
  );
}

/** Table with the Homelengo dashboard ink header bar. */
export function Table({ head, children, empty }: { head: string[]; children: React.ReactNode; empty?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[48rem] border-separate border-spacing-0 text-left text-sm">
        <thead>
          <tr>
            {head.map((h, i) => (
              <th key={h || i} className={`bg-ink px-4 py-3 font-semibold text-white ${i === 0 ? "rounded-l-lg" : ""} ${i === head.length - 1 ? "rounded-r-lg" : ""}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&_td]:border-b [&_td]:border-line [&_td]:px-4 [&_td]:py-4 [&_td]:align-top">{children}</tbody>
      </table>
      {empty && <p className="py-10 text-center text-ink-2">Qeyd yoxdur.</p>}
    </div>
  );
}

export function Tabs({ items, active }: { items: { href: string; label: string; key: string; count?: number }[]; active: string }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((it) => (
        <li key={it.key}>
          <a href={it.href} aria-current={it.key === active ? "page" : undefined} className="chip !min-h-10 hover:bg-brand-soft aria-[current=page]:bg-brand aria-[current=page]:text-white">
            {it.label}
            {it.count !== undefined && <span className="opacity-70">{it.count}</span>}
          </a>
        </li>
      ))}
    </ul>
  );
}

export function fmtDate(d: Date | null | undefined) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("az-AZ", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Baku" }).format(d);
}
