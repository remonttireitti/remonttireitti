import Link from "next/link";
import {
  availableFeaturedCalculators,
  featuredCalculatorHref,
  type FeaturedCalculator,
} from "@/lib/calculators/featured";
import { brand } from "@/lib/brand-theme";

function FeaturedCard({ item }: { item: FeaturedCalculator }) {
  return (
    <Link
      href={featuredCalculatorHref(item.hrefSlug)}
      className="group flex h-full flex-col rounded-2xl border border-violet-200/80 bg-white p-5 shadow-sm transition hover:border-violet-300 hover:shadow-md"
    >
      <span className="text-2xl" aria-hidden>
        {item.emoji}
      </span>
      <h3 className="mt-3 text-base font-bold text-stone-900 group-hover:text-violet-950">
        {item.label}
      </h3>
      <p className="mt-1.5 flex-1 text-sm leading-relaxed text-stone-600">
        {item.blurb}
      </p>
      <p className="mt-3 text-sm font-semibold text-violet-900">
        Tyypillinen arvio: {item.priceHint}
      </p>
      <span className="mt-3 text-sm font-semibold text-sky-700 group-hover:underline">
        Avaa laskuri →
      </span>
    </Link>
  );
}

export function FeaturedCalculatorCards({
  items,
  className = "",
}: {
  items?: FeaturedCalculator[];
  className?: string;
}) {
  const list = items ?? availableFeaturedCalculators();
  if (list.length === 0) return null;

  return (
    <ul className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${className}`}>
      {list.map((item) => (
        <li key={item.hrefSlug}>
          <FeaturedCard item={item} />
        </li>
      ))}
    </ul>
  );
}

export function FeaturedCalculatorsCta() {
  return (
    <div className={`${brand.actionsStack} mt-8 justify-center sm:flex-row`}>
      <Link href="/laskurit" className={`${brand.btnSecondary} ${brand.btnSecondaryBlock}`}>
        Kaikki remonttilaskurit
      </Link>
      <Link href="/remontti/uusi" className={`${brand.btnPrimary} ${brand.btnPrimaryBlock}`}>
        Pyydä tarjoukset ilmaiseksi
      </Link>
    </div>
  );
}
