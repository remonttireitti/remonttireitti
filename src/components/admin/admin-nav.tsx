"use client";

import Link from "next/link";
import { NavLinkPendingContent } from "@/components/navigation/nav-link-pending";

const links = [
  { href: "/admin", label: "Käyttäjät" },
  { href: "/admin/pyynnot", label: "Tarjouspyynnöt" },
  { href: "/admin/laskutus", label: "Laskutus" },
] as const;

export function AdminNav({ current }: { current: (typeof links)[number]["href"] }) {
  return (
    <nav className="mt-4 flex flex-wrap gap-2">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`rounded-full px-4 py-1.5 text-sm font-medium ${
            current === link.href
              ? "bg-sky-700 text-white"
              : "bg-white text-stone-700 ring-1 ring-stone-200 hover:bg-stone-50"
          }`}
        >
          <NavLinkPendingContent>{link.label}</NavLinkPendingContent>
        </Link>
      ))}
    </nav>
  );
}
