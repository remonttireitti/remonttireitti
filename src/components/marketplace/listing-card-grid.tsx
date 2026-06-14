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
  listing_kind?: "sell" | "wanted";
  highlighted_in_search?: boolean;
  thumbnail_url?: string | null;
};

const THUMB_SIZE = 72;

function ListingThumbnail({
  title,
  thumbnailUrl,
  highlighted,
}: {
  title: string;
  thumbnailUrl: string | null | undefined;
  highlighted?: boolean;
}) {
  return (
    <div
      className={`relative size-[4.5rem] shrink-0 overflow-hidden rounded-lg bg-stone-100 sm:size-20 ${
        highlighted ? "ring-2 ring-orange-300" : ""
      }`}
    >
      {thumbnailUrl ? (
        <Image
          src={thumbnailUrl}
          alt=""
          width={THUMB_SIZE}
          height={THUMB_SIZE}
          className="size-full object-cover"
          loading="lazy"
        />
      ) : (
        <span
          className="flex size-full items-center justify-center text-[10px] text-stone-400"
          aria-hidden
        >
          Ei kuvaa
        </span>
      )}
      <span className="sr-only">{title}</span>
    </div>
  );
}

function ListingMetaLine({ listing }: { listing: ListingCardItem }) {
  return (
    <span className="text-xs font-medium uppercase text-stone-500">
      {listing.listing_kind === "wanted" ? "Ostopyyntö · " : null}
      {listingCategoryLabel(listing.product_category ?? "device")} ·{" "}
      {listing.condition === "new" ? "Uusi" : "Käytetty"} ·{" "}
      {listing.seller_type === "customer" ? "Yksityinen" : "Yritys"}
    </span>
  );
}

function ListingPrice({ listing }: { listing: ListingCardItem }) {
  return (
    <p className="font-bold text-sky-800 sm:text-lg">
      {listing.listing_kind === "wanted"
        ? listing.price_eur != null
          ? `Budjetti max ${listing.price_eur.toLocaleString("fi-FI")} €`
          : "Budjetti neuvoteltavissa"
        : listing.price_eur != null
          ? `${listing.price_eur.toLocaleString("fi-FI")} €`
          : "Hinta neuvoteltavissa"}
    </p>
  );
}

function ListingListRow({ listing }: { listing: ListingCardItem }) {
  return (
    <li>
      <Link
        href={`/markkinapaikka/ilmoitukset/${listing.id}`}
        className={`flex gap-3 rounded-lg p-3 transition hover:bg-stone-50 sm:gap-4 sm:p-4 ${
          listing.highlighted_in_search
            ? "bg-orange-50/50 ring-1 ring-inset ring-orange-200"
            : ""
        }`}
      >
        <ListingThumbnail
          title={listing.title}
          thumbnailUrl={listing.thumbnail_url}
          highlighted={listing.highlighted_in_search}
        />
        <div className="min-w-0 flex-1">
          {listing.highlighted_in_search && (
            <span className="mb-1 inline-block rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-orange-900">
              Korostettu
            </span>
          )}
          <ListingMetaLine listing={listing} />
          <p className="mt-0.5 line-clamp-2 font-medium text-stone-900 sm:line-clamp-1">
            {listing.title}
          </p>
          <p className="mt-1 text-sm text-stone-500 sm:hidden">
            {listing.municipality}, {listing.postal_code}
          </p>
          <div className="mt-1 sm:hidden">
            <ListingPrice listing={listing} />
          </div>
        </div>
        <div className="hidden shrink-0 flex-col items-end justify-between text-right sm:flex">
          <ListingPrice listing={listing} />
          <p className="mt-2 text-sm text-stone-500">
            {listing.municipality}, {listing.postal_code}
          </p>
        </div>
      </Link>
    </li>
  );
}

function ListingGridCard({ listing }: { listing: ListingCardItem }) {
  return (
    <li className="h-full">
      <Link
        href={`/markkinapaikka/ilmoitukset/${listing.id}`}
        className={`flex h-full min-h-[14rem] flex-col overflow-hidden rounded-xl border bg-white shadow-sm transition hover:shadow-md ${
          listing.highlighted_in_search
            ? "border-orange-300 ring-2 ring-orange-200/80 hover:border-orange-400"
            : "border-stone-200 hover:border-sky-300"
        }`}
      >
        {listing.thumbnail_url ? (
          <div className="relative aspect-[16/10] w-full shrink-0 bg-stone-100">
            <Image
              src={listing.thumbnail_url}
              alt=""
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover"
              loading="lazy"
            />
            <span className="sr-only">{listing.title}</span>
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
          {listing.highlighted_in_search && (
            <span className="mb-2 w-fit rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-orange-900">
              Korostettu
            </span>
          )}
          <ListingMetaLine listing={listing} />
          <p className="mt-1 line-clamp-2 font-medium text-stone-900">
            {listing.title}
          </p>
          <div className="mt-2">
            <ListingPrice listing={listing} />
          </div>
          <p className="mt-auto pt-2 text-sm text-stone-500">
            {listing.municipality}, {listing.postal_code}
          </p>
        </div>
      </Link>
    </li>
  );
}

export function ListingCardGrid({
  listings,
  variant = "list",
}: {
  listings: ListingCardItem[];
  /** list = rivit pienoiskuvilla (tori), grid = korttiruudukko */
  variant?: "list" | "grid";
}) {
  if (!listings.length) {
    return (
      <p className="rounded-xl border border-dashed border-stone-300 bg-stone-50 p-8 text-center text-stone-600">
        Ei julkaistuja ilmoituksia juuri nyt.
      </p>
    );
  }

  if (variant === "grid") {
    return (
      <ul className="grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {listings.map((l) => (
          <ListingGridCard key={l.id} listing={l} />
        ))}
      </ul>
    );
  }

  return (
    <ul className="divide-y divide-stone-200 overflow-hidden rounded-xl border border-stone-200 bg-white">
      {listings.map((l) => (
        <ListingListRow key={l.id} listing={l} />
      ))}
    </ul>
  );
}
