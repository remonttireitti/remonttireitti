"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/components/dashboard/sidebar-context";
import { NAV_ICONS, NavIconChevron } from "@/components/dashboard/nav-icons";
import { DASHBOARD_SECTIONS, isNavActive } from "@/lib/navigation";

export function DashboardSidebar() {
  const pathname = usePathname();
  const { collapsed, toggle } = useSidebar();

  return (
    <aside
      className={`flex shrink-0 flex-col border-r border-stone-200 bg-white transition-[width] duration-200 ${
        collapsed ? "w-[4.25rem]" : "w-56"
      } min-h-screen`}
    >
      <div
        className={`flex items-center border-b border-stone-100 py-4 ${
          collapsed ? "justify-center px-2" : "justify-between px-4"
        }`}
      >
        {!collapsed && (
          <p className="text-lg font-bold tracking-tight text-stone-900">Älykoti</p>
        )}
        <button
          type="button"
          onClick={toggle}
          className="rounded-lg p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-800"
          aria-label={collapsed ? "Laajenna valikko" : "Pienennä valikko"}
          title={collapsed ? "Laajenna valikko" : "Pienennä valikko"}
        >
          <NavIconChevron collapsed={collapsed} />
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-2 py-4" aria-label="Päävalikko">
        {DASHBOARD_SECTIONS.map((section) => {
          const active = isNavActive(pathname, section);
          const Icon = NAV_ICONS[section.id];

          if (!section.enabled) {
            return (
              <span
                key={section.id}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-stone-400 ${
                  collapsed ? "justify-center px-2" : ""
                }`}
                title={section.description}
              >
                {Icon ? <Icon className="h-5 w-5 shrink-0" /> : null}
                {!collapsed && (
                  <>
                    {section.label}
                    <span className="ml-auto text-xs">tulossa</span>
                  </>
                )}
              </span>
            );
          }

          return (
            <Link
              key={section.id}
              href={section.href}
              title={collapsed ? section.label : section.description}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                collapsed ? "justify-center px-2" : ""
              } ${
                active
                  ? "bg-stone-900 text-white"
                  : "text-stone-700 hover:bg-stone-100"
              }`}
            >
              {Icon ? <Icon className="h-5 w-5 shrink-0" /> : null}
              {!collapsed && <span>{section.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-stone-100 p-2">
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-stone-600 hover:bg-stone-100 ${
              collapsed ? "justify-center px-2" : ""
            }`}
            title={collapsed ? "Kirjaudu ulos" : undefined}
          >
            <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {!collapsed && <span>Kirjaudu ulos</span>}
          </button>
        </form>
      </div>
    </aside>
  );
}
