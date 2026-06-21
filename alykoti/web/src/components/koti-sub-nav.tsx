"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LAITTEET } from "@/lib/laitteet-paths";

const TABS = [{ href: "/", label: "Yleiskatsaus" }] as const;

export function KotiSubNav() {
  const pathname = usePathname();

  return (
    <nav className="mt-4 flex flex-wrap gap-2" aria-label="Koti">
      {TABS.map((tab) => {
        const active = pathname === tab.href;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-xl px-3 py-1.5 text-sm font-medium transition ${
              active
                ? "bg-stone-900 text-white"
                : "border border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
      <Link
        href={LAITTEET.root}
        className="rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
      >
        Laitteet & integraatiot →
      </Link>
    </nav>
  );
}
