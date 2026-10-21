"use client";

import { Link, usePathname } from "@/i18n/navigation";

/** Homelengo-style primary navigation: 16px/600, active item underlined in blue. */
export function NavLinks({ links, vertical = false, onNavigate }: { links: { href: string; label: string }[]; vertical?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <ul className={vertical ? "flex flex-col" : "flex items-center gap-9"}>
      {links.map((l) => {
        const active = l.href === "/" ? pathname === "/" : pathname === l.href || pathname.startsWith(`${l.href}/`);
        return (
          <li key={l.href}>
            <Link
              href={l.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={
                vertical
                  ? "flex min-h-12 items-center border-b border-line text-base font-semibold aria-[current=page]:text-brand"
                  : "relative inline-flex min-h-11 items-center text-base font-semibold whitespace-nowrap text-ink transition-colors hover:text-brand after:absolute after:inset-x-0 after:bottom-2 after:h-0.5 after:scale-x-0 after:bg-brand after:transition-transform aria-[current=page]:after:scale-x-100"
              }
            >
              {l.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
