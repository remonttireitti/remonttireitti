"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LAITTEET } from "@/lib/laitteet-paths";

const TABS: Array<{ href: string; label: string; exact?: boolean }> = [
  { href: LAITTEET.root, label: "Integraatiot", exact: true },
  { href: LAITTEET.luettelo, label: "Laitteet" },
  { href: LAITTEET.valot, label: "Valot" },
  { href: LAITTEET.automaatio, label: "Automaatio" },
  { href: LAITTEET.keskusyksikko, label: "Keskusyksikkö" },
  { href: LAITTEET.shelly, label: "Shelly" },
  { href: LAITTEET.energia, label: "Energia" },
  { href: LAITTEET.tasmota, label: "Tasmota" },
  { href: LAITTEET.airthings, label: "Airthings" },
];

export function LaitteetSubNav() {
  const pathname = usePathname();

  return (
    <nav className="mt-4 flex flex-wrap gap-2" aria-label="Laitteet ja integraatiot">
      {TABS.map((tab) => {
        const active =
          tab.exact === true
            ? pathname === tab.href
            : pathname === tab.href || pathname.startsWith(`${tab.href}/`);

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
    </nav>
  );
}
