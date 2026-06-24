"use client";

import { usePathname } from "next/navigation";
import { useSidebar } from "@/components/dashboard/sidebar-context";
import { DASHBOARD_SECTIONS, isNavActive } from "@/lib/navigation";

export function MobileTopBar() {
  const pathname = usePathname();
  const { openMobile } = useSidebar();

  const section =
    DASHBOARD_SECTIONS.find((s) => s.enabled && isNavActive(pathname, s)) ??
    DASHBOARD_SECTIONS[0];

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-stone-200 bg-white/95 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-md md:hidden">
      <button
        type="button"
        onClick={openMobile}
        className="tap-target flex shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-stone-50 text-stone-700"
        aria-label="Avaa valikko"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
        </svg>
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-bold text-stone-900">{section?.label ?? "Älykoti"}</p>
        {section?.description && (
          <p className="truncate text-xs text-stone-500">{section.description}</p>
        )}
      </div>
    </header>
  );
}
