import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { brand } from "@/lib/brand-theme";
import { LISTING_PRODUCT_CATEGORIES } from "@/lib/marketplace-categories";
import { marketplaceBrand } from "@/lib/marketplace-brand";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: `${marketplaceBrand.name} — lämpöpumput ja osat`,
  description:
    "Osta ja myy käytettyjä ja uusia lämpöpumppuja, varaosia ja laitteita. Ilmoitukset yksityisiltä myyjiltä ja urakoitsijoilta.",
  path: "/markkinapaikka",
});

export default function MarketplacePage() {
  return (
    <div className="min-h-full bg-gradient-to-b from-sky-50/40 to-stone-50 text-stone-900">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <p className="text-sm font-medium uppercase tracking-wide text-sky-700">
          {marketplaceBrand.nameShort}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          {marketplaceBrand.name}
        </h1>
        <p className="mt-2 text-lg text-stone-500">{marketplaceBrand.tagline}</p>
        <p className="mt-4 max-w-2xl text-lg text-stone-600">
          Osta ja myy lämpöpumppuja, varaosia ja laitteita torilla. Selaa
          ilmoituksia alueeltasi tai lisää myytävä kohde — yksityisille ja
          ammattilaisille.
        </p>

        <div className="mt-10 flex flex-wrap gap-4">
          <Link href="/markkinapaikka/hinnasto" className={brand.btnPrimary}>
            Katso hinnasto
          </Link>
          <Link href="/markkinapaikka/ilmoitukset" className={brand.btnSecondary}>
            Selaa ilmoituksia
          </Link>
        </div>

        <div className="mt-16">
          <h2 className="text-lg font-semibold text-stone-900">Selaa tuoteryhmittäin</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {LISTING_PRODUCT_CATEGORIES.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/markkinapaikka/ilmoitukset?kategoria=${c.urlSlug}`}
                  className="block rounded-xl border border-stone-200 bg-white p-4 shadow-sm transition hover:border-sky-300 hover:shadow-md"
                >
                  <p className="font-semibold text-stone-900">{c.label}</p>
                  <p className="mt-1 text-sm text-stone-600">{c.description}</p>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-3">
          <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-stone-900">Yksityiselle</h2>
            <p className="mt-2 text-sm text-stone-600">
              Myy käytetty laite tai varaosa helposti. Ilmoitus on maksuton
              yksityishenkilölle.
            </p>
            <Link
              href="/markkinapaikka/ilmoita?tyyppi=kuluttaja"
              className="mt-4 inline-block text-sm font-medium text-sky-700 hover:underline"
            >
              Ilmoita myytävä →
            </Link>
          </div>
          <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-stone-900">Urakoitsijalle</h2>
            <p className="mt-2 text-sm text-stone-600">
              Näkyvyys ammattimyynnille — vaihto-, varasto- ja tukkutarjontaan.
              Hinnat yrityshinnastossa.
            </p>
            <Link
              href="/markkinapaikka/hinnasto#yritykset"
              className="mt-4 inline-block text-sm font-medium text-sky-700 hover:underline"
            >
              Hinnasto yrityksille →
            </Link>
          </div>
          <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-stone-900">Ostajalle</h2>
            <p className="mt-2 text-sm text-stone-600">
              Selaa ilmoituksia alueella. Ota yhteyttä myyjään suoraan
              ilmoituksen yhteystiedoista.
            </p>
            <Link
              href="/markkinapaikka/ilmoitukset"
              className="mt-4 inline-block text-sm font-medium text-sky-700 hover:underline"
            >
              Selaa →
            </Link>
          </div>
        </div>

        <p className="mt-12 text-center text-sm text-stone-500">
          Tarvitsetko asennusta?{" "}
          <Link href="/remontti/uusi" className="text-sky-700 hover:underline">
            Kilpailuta lämpöpumppu
          </Link>{" "}
          erikseen.
        </p>
      </main>
    </div>
  );
}
