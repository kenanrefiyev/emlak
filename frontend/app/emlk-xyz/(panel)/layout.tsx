import Link from "next/link";
import { requireAdmin } from "@/server/auth/current";
import { db } from "@/server/db";
import { Logo } from "@/components/site/logo";
import { AdminNav } from "@/components/admin/admin-nav";
import { adminLogoutAction } from "../session-actions";

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const [listings, roommates, reports, verifications, subs, support] = await Promise.all([
    db.listing.count({ where: { status: "PENDING_REVIEW" } }),
    db.roommateAd.count({ where: { status: "PENDING_REVIEW" } }),
    db.report.count({ where: { status: "OPEN" } }),
    db.verificationRequest.count({ where: { status: "PENDING" } }),
    db.subscription.count({ where: { status: "REQUESTED" } }),
    db.supportMessage.count({ where: { status: "OPEN" } }),
  ]);
  const items = [
    { href: "/emlk-xyz", label: "İdarəetmə paneli" },
    { href: "/emlk-xyz/elanlar", label: "Kirayə elanları", badge: listings },
    { href: "/emlk-xyz/ev-yoldasi", label: "Ev yoldaşı elanları", badge: roommates },
    { href: "/emlk-xyz/sikayetler", label: "Şikayətlər", badge: reports + support },
    { href: "/emlk-xyz/tesdiq", label: "Təsdiqlənmə sorğuları", badge: verifications },
    { href: "/emlk-xyz/istifadeciler", label: "İstifadəçilər" },
    { href: "/emlk-xyz/maklerler", label: "Maklerlər" },
    { href: "/emlk-xyz/olkeler", label: "Ölkələr və şəhərlər" },
    { href: "/emlk-xyz/erazilar", label: "Ərazilər" },
    { href: "/emlk-xyz/metro", label: "Metro stansiyaları" },
    { href: "/emlk-xyz/universitetler", label: "Universitetlər" },
    { href: "/emlk-xyz/abunelikler", label: "Abunəliklər", badge: subs },
    { href: "/emlk-xyz/vip", label: "VIP elanlar" },
    { href: "/emlk-xyz/statistika", label: "Statistika" },
    { href: "/emlk-xyz/tenzimlemeler", label: "Sistem tənzimləmələri" },
    { href: "/emlk-xyz/audit", label: "Audit jurnalı" },
  ];
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 bg-paper shadow-header">
        <div className="flex h-[70px] items-center justify-between gap-4 px-4 lg:px-8">
          <Link href="/emlk-xyz" aria-label="İdarəetmə paneli">
            <Logo tagline="idarəetmə paneli" />
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <Link href="/az" className="btn btn-ghost btn-sm hidden sm:inline-flex">
              Sayta keç
            </Link>
            <span className="hidden font-semibold md:inline">{admin.name}</span>
            <form action={adminLogoutAction}>
              <button type="submit" className="btn btn-outline btn-sm">
                Çıxış
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="grid gap-[30px] p-4 lg:grid-cols-[16.5rem_1fr] lg:p-8">
        <aside className="rounded-xl bg-paper p-3 lg:sticky lg:top-[100px] lg:self-start lg:p-4">
          <AdminNav items={items} />
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
