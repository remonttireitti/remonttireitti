import Image from "next/image";
import Link from "next/link";
import {
  listingCategoryLabel,
  type ListingProductCategory,
} from "@/lib/marketplace-categories";

export type ListingCardItem = {
  id: string;
  title: string;
  price_eur: number | null;
  municipality: string;
  postal_code: string;
  condition: "used" | "new";
  seller_type: "contractor" | "customer";
  product_category: ListingProductCategory;
  highlighted_in_search?: boolean;
  thumbnail_url?: string | null;
};

export function ListingCardGrid({ listings }: { listings: ListingCardItem[] }) {
  if (!listings.length) {
    return (
      <p className="rounded-xl border border-dashed border-stone-300 bg-stone-50 p-8 text-center text-stone-600">
        Ei julkaistuja ilmoituksia juuri nyt.
      </p>
    );
  }

  return (
    <ul className="grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {listings.map((l) => (
        <li key={l.id} className="h-full">
          <Link
            href={`/markkinapaikka/ilmoitukset/${l.id}`}
            className={`flex h-full min-h-[14rem] flex-col overflow-hidden rounded-xl border bg-white shadow-sm transition hover:shadow-md ${
              l.highlighted_in_search
                ? "border-orange-300 ring-2 ring-orange-200/80 hover:border-orange-400"
                : "border-stone-200 hover:border-sky-300"
            }`}
          >
            {l.thumbnail_url ? (
              <div className="relative aspect-[16/10] w-full shrink-0 bg-stone-100">
                <Image
                  src={l.thumbnail_url}
                  alt={l.title}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover"
                  loading="lazy"
                />
              </div>
            ) : (
              <div
                className="flex aspect-[16/10] w-full shrink-0 items-center justify-center bg-stone-100 text-xs text-stone-400"
                aria-hidden
              >
                Ei kuvaa
              </div>
            )}
            <div className="flex flex-1 flex-col p-4">
              {l.highlighted_in_search && (
                <span className="mb-2 w-fit rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-orange-900">
                  Korostettu
                </span>
              )}
              <span className="text-xs font-medium uppercase text-stone-500">
                {listingCategoryLabel(l.product_category ?? "device")} ·{" "}
                {l.condition === "new" ? "Uusi" : "Käytetty"} ·{" "}
                {l.seller_type === "customer" ? "Yksityinen" : "Yritys"}
              </span>
              <p className="mt-1 line-clamp-2 font-medium text-stone-900">
                {l.title}
              </p>
              <p className="mt-2 text-lg font-bold text-sky-800">
                {l.price_eur != null
                  ? `${l.price_eur.toLocaleString("fi-FI")} €`
                  : "Hinta neuvoteltavissa"}
              </p>
              <p className="mt-auto pt-2 text-sm text-stone-500">
                {l.municipality}, {l.postal_code}
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
