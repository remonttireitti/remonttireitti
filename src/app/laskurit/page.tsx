import type { Metadata } from "next";
import Link from "next/link";
import {
  FeaturedCalculatorCards,
  FeaturedCalculatorsCta,
} from "@/components/calculator/featured-calculator-cards";
import { CalculatorsIndexJsonLd } from "@/components/seo/calculators-index-json-ld";
import { SiteHeader } from "@/components/site-header";
import { brand } from "@/lib/brand-theme";
import {
  calculatorPath,
  getCalculatorsGroupedByArea,
} from "@/lib/calculators/registry";
import { pageMetadata } from "@/lib/seo";
import { seoDefByPath } from "@/lib/seo-pages";

const seo = seoDefByPath("/laskurit")!;

export const metadata: Metadata = pageMetadata({
  title: seo.title,
  description: seo.description,
  path: "/laskurit",
  keywords: seo.keywords,
});

export default function CalculatorsIndexPage() {
  const groups = getCalculatorsGroupedByArea();

  return (
    <div className={brand.page}>
      <CalculatorsIndexJsonLd />
      <SiteHeader />
      <main className={brand.mainWide}>
        <Link href="/" className="text-sm text-sky-700 hover:underline">
          ← Etusivu
        </Link>

        <h1 className="mt-4 text-2xl font-bold sm:text-3xl">
          Remontin hintalaskurit
        </h1>
        <p className="mt-2 max-w-2xl text-base leading-relaxed text-stone-600">
          Arvioi remonttisi kustannuksia ennen tarjouspyyntöä. Jokaisessa laskurissa
          muokattavat viitehinnat, työnkuvaukset ja kustannusjako — lopuksi voit pyytää
          oikeat tarjoukset ilmaiseksi.
        </p>

        <section className="mt-10">
          <h2 className="text-lg font-bold text-stone-900">Suosituimmat laskurit</h2>
          <FeaturedCalculatorCards className="mt-4" />
          <FeaturedCalculatorsCta />
        </section>

        <section className="mt-12 space-y-10">
          <h2 className="text-lg font-bold text-stone-900">Kaikki laskurit alueittain</h2>
          {groups.map((group) => (
            <section key={group.areaSlug}>
              <h3 className="text-base font-semibold text-stone-800">{group.areaTitle}</h3>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {group.calculators.map((calc) => (
                  <li key={calc.slug}>
                    <Link
                      href={calculatorPath(calc.slug)}
                      className="block h-full rounded-2xl border border-stone-200 bg-white p-4 transition hover:border-sky-300 hover:shadow-md"
                    >
                      <p className="font-semibold text-stone-900">{calc.title}</p>
                      <p className="mt-1 line-clamp-2 text-sm text-stone-600">
                        {calc.metaDescription}
                      </p>
                      <p className="mt-2 text-sm font-medium text-sky-700">
                        Avaa laskuri →
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </section>

        <aside className={`${brand.section} mt-12 p-6`}>
          <h2 className="text-lg font-bold text-stone-900">
            Laskurista tarjouspyyntöön
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-stone-600">
            Kun olet saanut suuntaa-antavan arvion, jätä ilmainen tarjouspyyntö.
            Urakoitsijat näkevät työn laajuuden ja vastaavat alueellisilla hinnoilla —
            vertailet tarjoukset samassa muodossa.
          </p>
          <Link
            href="/remontti/uusi"
            className={`${brand.btnPrimary} mt-4 inline-flex`}
          >
            Pyydä tarjoukset ilmaiseksi
          </Link>
        </aside>
      </main>
    </div>
  );
}
