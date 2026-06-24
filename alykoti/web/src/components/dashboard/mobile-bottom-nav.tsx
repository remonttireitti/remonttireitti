"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ICONS } from "@/components/dashboard/nav-icons";
import { DASHBOARD_SECTIONS, isNavActive } from "@/lib/navigation";

/** Päänavigaatio alareunassa — vain mobiili. */
export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
      aria-label="Päänavigaatio"
    >
      <ul className="flex items-stretch justify-around gap-0.5 px-1 pt-1">
        {DASHBOARD_SECTIONS.filter((s) => s.enabled).map((section) => {
          const active = isNavActive(pathname, section);
          const Icon = NAV_ICONS[section.id];
          return (
            <li key={section.id} className="min-w-0 flex-1">
              <Link
                href={section.href}
                className={`relative flex min-h-[3.25rem] flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-semibold leading-tight transition active:scale-95 ${
                  active ? "text-stone-900" : "text-stone-500"
                }`}
                aria-current={active ? "page" : undefined}
              >
                {Icon ? (
                  <Icon
                    className={`h-6 w-6 shrink-0 ${active ? "text-stone-900" : "text-stone-400"}`}
                  />
                ) : null}
                <span className="max-w-full truncate">{section.label}</span>
                {active && (
                  <span className="absolute bottom-[calc(0.25rem+env(safe-area-inset-bottom))] h-0.5 w-8 rounded-full bg-stone-900" />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
