"use client";

import { Link, usePathname } from "@/i18n/navigation";

export function SideNav({ items, label }: { items: { href: string; label: string; badge?: number }[]; label: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label={label}>
      <ul className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:px-0">
        {items.map((it) => {
          const active = it.href === pathname || (it.href !== items[0]!.href && pathname.startsWith(`${it.href}/`));
          return (
            <li key={it.href} className="shrink-0">
              <Link
                href={it.href}
                aria-current={active ? "page" : undefined}
                className="flex min-h-12 items-center justify-between gap-3 rounded-lg px-4 text-[0.9375rem] font-semibold whitespace-nowrap text-ink hover:bg-mist hover:text-brand aria-[current=page]:bg-brand aria-[current=page]:text-white"
              >
                {it.label}
                {it.badge ? <span className="grid min-w-6 place-items-center rounded-full bg-pending px-1.5 text-xs font-bold text-white">{it.badge}</span> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
