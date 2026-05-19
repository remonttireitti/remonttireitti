export type ListingProductCategory =
  | "device"
  | "spare_part"
  | "supply"
  | "tool";

export const LISTING_PRODUCT_CATEGORIES = [
  {
    slug: "device" as const,
    urlSlug: "laitteet",
    label: "Laitteet",
    labelSingular: "Laite",
    description: "Lämpöpumput ja muut laitteet kokonaisina",
  },
  {
    slug: "spare_part" as const,
    urlSlug: "varaosat",
    label: "Varaosat",
    labelSingular: "Varaosa",
    description: "Komponentit, patruunat, ohjausyksiköt ja varaosat",
  },
  {
    slug: "supply" as const,
    urlSlug: "tarvikkeet",
    label: "Tarvikkeet",
    labelSingular: "Tarvike",
    description: "Asennus- ja huoltotarvikkeet, nesteet, eristeet",
  },
  {
    slug: "tool" as const,
    urlSlug: "tyokalut",
    label: "Työkalut",
    labelSingular: "Työkalu",
    description: "Mittaus-, asennus- ja huoltotyökalut",
  },
] as const;

const bySlug = new Map(
  LISTING_PRODUCT_CATEGORIES.map((c) => [c.slug, c] as const),
);

const byUrlSlug = new Map<string, (typeof LISTING_PRODUCT_CATEGORIES)[number]>(
  LISTING_PRODUCT_CATEGORIES.map((c) => [c.urlSlug, c]),
);

export function getListingCategory(slug: ListingProductCategory) {
  return bySlug.get(slug)!;
}

export function listingCategoryFromUrlParam(
  param: string | undefined,
): ListingProductCategory | null {
  if (!param) return null;
  const found = byUrlSlug.get(param);
  return found?.slug ?? null;
}

export function listingCategoryUrlSlug(
  category: ListingProductCategory,
): string {
  return getListingCategory(category).urlSlug;
}

export function listingCategoryLabel(category: ListingProductCategory): string {
  return getListingCategory(category).labelSingular;
}

export function isDeviceListing(category: ListingProductCategory): boolean {
  return category === "device";
}

export function parseListingProductCategory(
  raw: FormDataEntryValue | null,
): ListingProductCategory {
  const value = String(raw ?? "device");
  if (bySlug.has(value as ListingProductCategory)) {
    return value as ListingProductCategory;
  }
  const fromUrl = listingCategoryFromUrlParam(value);
  return fromUrl ?? "device";
}
