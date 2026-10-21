import { useTranslations } from "next-intl";

const tone: Record<string, string> = {
  NEW: "bg-brand-soft text-brand",
  CONTACTED: "bg-mist text-ink",
  VIEWING_SCHEDULED: "bg-warn-soft text-warn",
  COMPLETED: "bg-ok-soft text-ok",
  CLOSED: "bg-gray text-ink-3",
};

export function LeadBadge({ status }: { status: string }) {
  const t = useTranslations("dashboard.leadStatus");
  return <span className={`tag ${tone[status] ?? tone.CLOSED}`}>{t(status as "NEW")}</span>;
}

const listingTone: Record<string, string> = {
  DRAFT: "bg-gray text-ink-2",
  PENDING_REVIEW: "bg-warn-soft text-warn",
  ACTIVE: "bg-ok-soft text-ok",
  EXPIRED: "bg-danger-soft text-danger",
  REJECTED: "bg-danger-soft text-danger",
  RENTED: "bg-brand-soft text-brand",
  ARCHIVED: "bg-gray text-ink-3",
};

export function ListingStatusBadge({ status }: { status: string }) {
  const t = useTranslations("dashboard.status");
  return <span className={`tag ${listingTone[status] ?? listingTone.DRAFT}`}>{t(status as "ACTIVE")}</span>;
}
