import Link from "next/link";
import { brand } from "@/lib/brand-theme";
import { LISTING_SINGLE } from "@/lib/marketplace-pricing";

export function ContractorListingPaywall({
  reason,
  singleListingHref,
}: {
  reason: "no_subscription" | "quota_full";
  singleListingHref: string;
}) {
  return (
    <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/80 p-6">
      <h2 className="text-base font-semibold text-amber-950">
        {reason === "quota_full"
          ? "Kuukausikiintiö on täynnä"
          : "Yritysilmoitus vaatii maksullisen paketin"}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-amber-950">
        {reason === "quota_full" ? (
          <>
            Kk-tilauksesi ilmoituspaikat ovat käytössä tällä jaksolla. Voit odottaa
            seuraavaa laskutuskautta, tilata suuremman paketin tai julkaista yksittäisen
            ilmoituksen.
          </>
        ) : (
          <>
            Torin yritysilmoitukset ovat maksullisia. Ilman aktiivista tilausta et voi
            täyttää ilmoituslomaketta — valitse ensin kk-paketti tai yksittäinen
            ilmoitus.
          </>
        )}
      </p>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Link href="/markkinapaikka/tilaa" className={brand.btnPrimary}>
          Tilaa kk-paketti
        </Link>
        <Link href={singleListingHref} className={brand.btnSecondary}>
          Yksittäinen ilmoitus ({LISTING_SINGLE.priceLabel})
        </Link>
        <Link
          href="/markkinapaikka/hinnasto#yritykset"
          className="inline-flex items-center text-sm font-medium text-sky-800 hover:underline"
        >
          Katso hinnasto →
        </Link>
      </div>

      <p className="mt-4 text-xs text-amber-900/80">
        Lasku lähetetään sähköpostiin. Julkaisu tapahtuu maksun kirjauksen jälkeen
        (yleensä 1–2 arkipäivää).
      </p>
    </section>
  );
}
