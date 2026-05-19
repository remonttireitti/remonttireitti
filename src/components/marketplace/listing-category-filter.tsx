import type { ReactNode } from "react";
import Link from "next/link";
import {
  LISTING_PRODUCT_CATEGORIES,
  type ListingProductCategory,
} from "@/lib/marketplace-categories";

export function ListingCategoryFilter({
  active,
}: {
  active: ListingProductCategory | null;
}) {
  const base = "/markkinapaikka/ilmoitukset";

  return (
    <nav
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden"
      aria-label="Tuoteryhmät"
    >
      <CategoryChip href={base} active={active === null}>
        Kaikki
      </CategoryChip>
      {LISTING_PRODUCT_CATEGORIES.map((c) => (
        <CategoryChip
          key={c.slug}
          href={`${base}?kategoria=${c.urlSlug}`}
          active={active === c.slug}
        >
          {c.label}
        </CategoryChip>
      ))}
    </nav>
  );
}

function CategoryChip({
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
      className={`shrink-0 whitespace-nowrap ${
        active
          ? "rounded-full bg-sky-800 px-4 py-2 text-sm font-medium text-white"
          : "rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:border-sky-400 hover:text-sky-800"
      }`}
    >
      {children}
    </Link>
  );
}
