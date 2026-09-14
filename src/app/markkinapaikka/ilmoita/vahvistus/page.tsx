import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { brand } from "@/lib/brand-theme";
import { marketplaceBrand } from "@/lib/marketplace-brand";

export default async function ListingVerificationSentPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; vieras?: string }>;
}) {
  const { email, vieras } = await searchParams;
  const isGuest = vieras === "1";
  const displayEmail = email?.trim() || "sähköpostiisi";

  return (
    <div className={brand.page}>
      <SiteHeader />
      <main className={`${brand.mainStandard} text-center`}>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Tarkista sähköpostisi
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-stone-600 sm:text-base">
          Lähetimme vahvistuslinkin osoitteeseen{" "}
          <span className="font-medium text-stone-900">{displayEmail}</span>. Avaa
          linkki julkaistaksesi ilmoituksen {marketplaceBrand.nameShort.toLowerCase()}lla.
        </p>
        <p className="mx-auto mt-3 max-w-lg text-xs text-stone-500">
          Vahvistuslinkki on voimassa 24 tuntia. Ilmoitus näkyy torilla vasta
          linkin avaamisen jälkeen. Vahvistamatta jääneet ilmoitukset poistetaan
          automaattisesti.
        </p>
        <p className="mx-auto mt-3 max-w-lg text-xs text-stone-500">
          Samaan sähköpostiosoitteeseen voi liittyä enintään 2 aktiivista
          ilmoitusta kerrallaan.
          {isGuest && (
            <>
              {" "}
              Ilman tiliä hallitset ilmoitusta sähköpostiin tulevalla linkillä —
              tallenna viesti, jotta löydät sen myöhemmin.
            </>
          )}
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          {!isGuest && (
            <Link
              href="/markkinapaikka/omat-ilmoitukset"
              className={`${brand.btnSecondary} ${brand.btnSecondaryBlock}`}
            >
              Omat ilmoitukset
            </Link>
          )}
          <Link
            href="/markkinapaikka/ilmoita?tyyppi=kuluttaja"
            className={`${brand.btnPrimary} ${brand.btnPrimaryBlock}`}
          >
            Uusi ilmoitus
          </Link>
        </div>
      </main>
    </div>
  );
}
