import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { brand } from "@/lib/brand-theme";

export default async function ProjectSubmittedPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  const displayEmail = email?.trim() || "sähköpostiisi";

  return (
    <div className={brand.page}>
      <SiteHeader />
      <main className={`${brand.mainStandard} text-center`}>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Tarjouspyyntö lähetetty — tarkista sähköpostisi
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-stone-600 sm:text-base">
          Lähetimme vahvistuslinkin osoitteeseen{" "}
          <span className="font-medium text-stone-900">{displayEmail}</span>. Avaa linkki
          julkaistaksesi pyynnön urakoitsijoille ja saadaksesi henkilökohtaisen
          linkin tarjouksiin.
        </p>
        <p className="mx-auto mt-3 max-w-lg text-xs text-stone-500">
          Vahvistuslinkki on voimassa 24 tuntia. Julkaisu urakoitsijoille tapahtuu vasta
          linkin avaamisen jälkeen — ennen sitä pyyntöä ei näytetä eikä siitä lähetetä
          ilmoituksia. Vahvistamatta jääneet tiedot poistetaan automaattisesti.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/" className={`${brand.btnSecondary} ${brand.btnSecondaryBlock}`}>
            Etusivulle
          </Link>
          <Link href="/remontti/uusi" className={`${brand.btnPrimary} ${brand.btnPrimaryBlock}`}>
            Jätä toinen pyyntö
          </Link>
        </div>
      </main>
    </div>
  );
}
