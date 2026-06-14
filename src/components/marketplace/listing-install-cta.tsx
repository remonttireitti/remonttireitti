import Link from "next/link";
import { brand } from "@/lib/brand-theme";
import {
  buildListingInstallHref,
  isListingInstallEligible,
  type ListingInstallSource,
} from "@/lib/listing-install-link";

export function ListingInstallCta({ listing }: { listing: ListingInstallSource }) {
  if (!isListingInstallEligible(listing)) return null;

  const href = buildListingInstallHref(listing);
  if (!href) return null;

  return (
    <section className="mt-8 rounded-xl border border-orange-200 bg-orange-50/70 p-5 sm:p-6">
      <h2 className="font-semibold text-orange-950">Tarvitsetko asennuksen?</h2>
      <p className="mt-2 text-sm leading-relaxed text-orange-950/90">
        Voit kilpailuttaa asennuksen tai käyttöönoton ilmaiseksi. Laite- ja
        ilmoitustiedot täyttyvät automaattisesti tarjouspyyntöön.
      </p>
      <Link
        href={href}
        className={`${brand.btnPrimary} mt-4 inline-block rounded-full px-5 py-2.5 text-sm`}
      >
        Kilpailuta asennus →
      </Link>
    </section>
  );
}
