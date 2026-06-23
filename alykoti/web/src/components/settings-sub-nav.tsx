"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LAITTEET } from "@/lib/laitteet-paths";

const ITEMS: Array<{ href: string; label: string; exact?: boolean }> = [
  { href: LAITTEET.root, label: "Integraatiot", exact: true },
  { href: LAITTEET.luettelo, label: "Kaikki laitteet" },
  { href: LAITTEET.keskusyksikko, label: "Keskusyksikkö" },
  { href: LAITTEET.zigbee, label: "Zigbee" },
  { href: LAITTEET.zwave, label: "Z-Wave" },
  { href: LAITTEET.automaatio, label: "Automaatio" },
  { href: LAITTEET.shelly, label: "Shelly" },
  { href: LAITTEET.tasmota, label: "Tasmota" },
  { href: LAITTEET.airthings, label: "Airthings" },
  { href: LAITTEET.energia, label: "Energia" },
  { href: "/ilmanvaihto/asetukset", label: "Ilmanvaihto" },
];

export function SettingsSubNav({ horizontal = false }: { horizontal?: boolean }) {
  const pathname = usePathname();

  return (
    <nav
      className={horizontal ? "flex min-w-max gap-1" : "flex flex-col gap-0.5"}
      aria-label="Asetukset"
    >
      {ITEMS.map((item) => {
        const active =
          item.exact === true
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition whitespace-nowrap ${
              active
                ? "bg-stone-900 text-white"
                : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
