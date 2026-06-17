"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DASHBOARD_SECTIONS, isNavActive } from "@/lib/navigation";

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-full flex-col border-b border-stone-200 bg-white md:w-56 md:border-b-0 md:border-r md:min-h-screen">
      <div className="border-b border-stone-100 px-4 py-5 md:px-5">
        <p className="text-lg font-bold tracking-tight text-stone-900">Älykoti</p>
      </div>

      <nav className="flex gap-1 overflow-x-auto px-2 py-3 md:flex-col md:overflow-visible md:px-3 md:py-4">
        {DASHBOARD_SECTIONS.map((section) => {
          const active = section.enabled && isNavActive(pathname, section.href);

          if (!section.enabled) {
            return (
              <span
                key={section.id}
                className="shrink-0 rounded-xl px-3 py-2 text-sm text-stone-400 md:shrink"
                title={section.description}
              >
                {section.label}
                <span className="ml-1.5 text-xs">· tulossa</span>
              </span>
            );
          }

          return (
            <Link
              key={section.id}
              href={section.href}
              className={`shrink-0 rounded-xl px-3 py-2 text-sm font-medium transition md:shrink ${
                active
                  ? "bg-stone-900 text-white"
                  : "text-stone-700 hover:bg-stone-100"
              }`}
            >
              {section.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto hidden border-t border-stone-100 p-4 md:block">
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="w-full rounded-xl px-3 py-2 text-left text-sm text-stone-600 hover:bg-stone-100"
          >
            Kirjaudu ulos
          </button>
        </form>
      </div>
    </aside>
  );
}
