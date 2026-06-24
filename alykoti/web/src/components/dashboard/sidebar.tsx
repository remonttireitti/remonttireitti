"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useSidebar } from "@/components/dashboard/sidebar-context";
import { NAV_ICONS, NavIconChevron } from "@/components/dashboard/nav-icons";
import { DASHBOARD_SECTIONS, isNavActive } from "@/lib/navigation";

function NavLinks({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      {DASHBOARD_SECTIONS.map((section) => {
        const active = isNavActive(pathname, section);
        const Icon = NAV_ICONS[section.id];

        if (!section.enabled) {
          return (
            <span
              key={section.id}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-stone-400 ${
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
            onClick={onNavigate}
            title={collapsed ? section.label : section.description}
            className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition active:scale-[0.98] ${
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
    </>
  );
}

export function DashboardSidebar() {
  const { collapsed, toggle, mobileOpen, closeMobile } = useSidebar();
  const pathname = usePathname();

  useEffect(() => {
    closeMobile();
  }, [pathname, closeMobile]);

  return (
    <>
      {/* Mobiili: tausta + vetolaatikko */}
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-50 bg-stone-900/40 md:hidden"
          aria-label="Sulje valikko"
          onClick={closeMobile}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(18rem,88vw)] flex-col border-r border-stone-200 bg-white shadow-xl transition-transform duration-200 md:static md:z-auto md:min-h-screen md:w-auto md:shrink-0 md:translate-x-0 md:shadow-none ${
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        } ${collapsed ? "md:w-[4.25rem]" : "md:w-56"}`}
        aria-hidden={!mobileOpen ? undefined : false}
      >
        <div
          className={`flex items-center border-b border-stone-100 py-4 pt-[max(1rem,env(safe-area-inset-top))] ${
            collapsed ? "justify-center px-2 md:justify-center" : "justify-between px-4"
          }`}
        >
          {(!collapsed || mobileOpen) && (
            <p className="text-lg font-bold tracking-tight text-stone-900">Älykoti</p>
          )}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={closeMobile}
              className="tap-target rounded-lg p-2 text-stone-500 hover:bg-stone-100 md:hidden"
              aria-label="Sulje valikko"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            </button>
            <button
              type="button"
              onClick={toggle}
              className="tap-target hidden rounded-lg p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-800 md:flex"
              aria-label={collapsed ? "Laajenna valikko" : "Pienennä valikko"}
              title={collapsed ? "Laajenna valikko" : "Pienennä valikko"}
            >
              <NavIconChevron collapsed={collapsed} />
            </button>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-2 py-4" aria-label="Päävalikko">
          <NavLinks
            collapsed={collapsed && !mobileOpen}
            onNavigate={closeMobile}
          />
        </nav>

        <div className="border-t border-stone-100 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className={`tap-target flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-stone-600 hover:bg-stone-100 ${
                collapsed && !mobileOpen ? "justify-center px-2" : ""
              }`}
              title={collapsed ? "Kirjaudu ulos" : undefined}
            >
              <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {(!collapsed || mobileOpen) && <span>Kirjaudu ulos</span>}
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
