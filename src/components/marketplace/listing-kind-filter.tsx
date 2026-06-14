"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { EquipmentListingKind } from "@/lib/marketplace-listings";

export function ListingKindFilter({
  active,
  categoryQuery,
}: {
  active: EquipmentListingKind | null;
  categoryQuery?: string;
}) {
  const base = "/markkinapaikka/ilmoitukset";
  const suffix = categoryQuery ? `?kategoria=${categoryQuery}` : "";

  function href(kind: EquipmentListingKind | null): string {
    if (!kind) return `${base}${suffix}`;
    const sep = suffix ? "&" : "?";
    return `${base}${suffix}${sep}tyyppi=${kind === "wanted" ? "ostopyynto" : "myynti"}`;
  }

  return (
    <nav
      className="mt-4 flex flex-wrap gap-2"
      aria-label="Ilmoitustyyppi"
    >
      <KindChip href={href(null)} active={active === null}>
        Kaikki tyypit
      </KindChip>
      <KindChip href={href("sell")} active={active === "sell"}>
        Myydään
      </KindChip>
      <KindChip href={href("wanted")} active={active === "wanted"}>
        Haluan ostaa
      </KindChip>
    </nav>
  );
}

function KindChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full px-4 py-2 text-sm font-medium ${
        active
          ? "bg-stone-800 text-white"
          : "border border-stone-300 bg-white text-stone-700 hover:border-stone-400"
      }`}
    >
      {children}
    </Link>
  );
}

export function listingKindFromUrlParam(
  value: string | undefined,
): EquipmentListingKind | null {
  if (value === "ostopyynto") return "wanted";
  if (value === "myynti") return "sell";
  return null;
}
