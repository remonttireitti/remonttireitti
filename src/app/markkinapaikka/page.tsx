import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { brand } from "@/lib/brand-theme";
import { getSessionUser, isContractor } from "@/lib/auth";
import { LISTING_PRODUCT_CATEGORIES } from "@/lib/marketplace-categories";
import { marketplaceCreateListingPath } from "@/lib/marketplace-listing-links";
import { marketplaceBrand } from "@/lib/marketplace-brand";
import { pageMetadata } from "@/lib/seo";
import { seoDefByPath } from "@/lib/seo-pages";

const seo = seoDefByPath("/markkinapaikka")!;

export const metadata: Metadata = pageMetadata({
  title: seo.title,
  description: seo.description,
  path: "/markkinapaikka",
  keywords: seo.keywords,
});

export default async function MarketplacePage() {
  const user = await getSessionUser();
  const contractor = user ? await isContractor() : false;
  const createListingHref = marketplaceCreateListingPath(contractor);

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
          Osta ja myy remonttiin liittyviä laitteita, varaosia ja tarvikkeita.
          Lämmitys, keittiö, kylpyhuone, sähkö, rakennustarvikkeet ja muut —
          selaa ilmoituksia alueeltasi tai lisää myytävä kohde
          {contractor ? " yrityksenä" : " — yksityisille ja ammattilaisille"}.
        </p>

        <div className={`mt-10 ${brand.actionsStack}`}>
          <Link
            href={contractor ? createListingHref : "/markkinapaikka/hinnasto"}
            className={`${brand.btnPrimary} ${brand.btnPrimaryBlock}`}
          >
            {contractor ? "Ilmoita myytävä" : "Katso hinnasto"}
          </Link>
          <Link
            href="/markkinapaikka/ilmoitukset"
            className={`${brand.btnSecondary} ${brand.btnSecondaryBlock}`}
          >
            Selaa ilmoituksia
          </Link>
        </div>

        <div className="mt-16">
          <h2 className="text-lg font-semibold text-stone-900">Selaa tuoteryhmittäin</h2>
          <ul className="mt-4 grid auto-rows-fr gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {LISTING_PRODUCT_CATEGORIES.map((c) => (
              <li key={c.slug} className="h-full">
                <Link
                  href={`/markkinapaikka/ilmoitukset?kategoria=${c.urlSlug}`}
                  className="flex h-full min-h-[6.5rem] flex-col rounded-xl border border-stone-200 bg-white p-4 shadow-sm transition hover:border-sky-300 hover:shadow-md"
                >
                  <p className="font-semibold text-stone-900">{c.label}</p>
                  <p className="mt-1 flex-1 text-sm leading-snug text-stone-600">
                    {c.description}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div
          className={`mt-16 grid auto-rows-fr gap-6 ${contractor ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}
        >
          {!contractor && (
            <div className="flex h-full min-h-[11rem] flex-col rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-stone-900">Yksityiselle</h2>
              <p className="mt-2 flex-1 text-sm text-stone-600">
                Myy ylimääräinen laite, varaosa tai remonttitarvike helposti.
                Ilmoitus on maksuton yksityishenkilölle.
              </p>
              <Link
                href="/markkinapaikka/ilmoita?tyyppi=kuluttaja"
                className="mt-4 inline-block text-sm font-medium text-sky-700 hover:underline"
              >
                Ilmoita myytävä →
              </Link>
            </div>
          )}
          <div className="flex h-full min-h-[11rem] flex-col rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-stone-900">Urakoitsijalle</h2>
            <p className="mt-2 flex-1 text-sm text-stone-600">
              Näkyvyys ammattimyynnille — vaihtourakat, varasto ja osamyynti.
              Hinnat yrityshinnastossa.
            </p>
            <Link
              href={contractor ? createListingHref : "/markkinapaikka/hinnasto#yritykset"}
              className="mt-4 inline-block text-sm font-medium text-sky-700 hover:underline"
            >
              {contractor ? "Ilmoita yrityksenä →" : "Hinnasto yrityksille →"}
            </Link>
          </div>
          <div className="flex h-full min-h-[11rem] flex-col rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-stone-900">Ostajalle</h2>
            <p className="mt-2 flex-1 text-sm text-stone-600">
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
          Tarvitsetko asennusta tai urakoitsijaa?{" "}
          <Link href="/remontti/uusi" className="text-sky-700 hover:underline">
            Kilpailuta remontti
          </Link>{" "}
          erikseen.
        </p>
      </main>
    </div>
  );
}
