import type { Metadata } from "next";
import Link from "next/link";
import {
  FeaturedCalculatorCards,
  FeaturedCalculatorsCta,
} from "@/components/calculator/featured-calculator-cards";
import {
  CalculatorsIndexSearch,
  type CalculatorsIndexGroup,
} from "@/components/calculator/calculators-index-search";
import { CalculatorsIndexJsonLd } from "@/components/seo/calculators-index-json-ld";
import { SiteHeader } from "@/components/site-header";
import { brand } from "@/lib/brand-theme";
import {
  publicCalculatorPath,
  getCalculatorsGroupedByArea,
  getSlugAliasesForCalculator,
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

function buildSearchGroups(): CalculatorsIndexGroup[] {
  return getCalculatorsGroupedByArea().map((group) => ({
    areaSlug: group.areaSlug,
    areaTitle: group.areaTitle,
    calculators: group.calculators.map((calc) => {
      const aliases = getSlugAliasesForCalculator(calc.slug);
      const searchText = [
        calc.title,
        calc.pageTitle,
        calc.metaDescription,
        calc.intro,
        calc.slug,
        calc.jobSlug,
        group.areaTitle,
        ...aliases,
        ...calc.lineItems.flatMap((li) => [
          li.label,
          li.description,
          li.searchHint ?? "",
        ]),
      ]
        .join(" ")
        .toLowerCase();

      return {
        slug: calc.slug,
        href: publicCalculatorPath(calc.slug),
        title: calc.title,
        description: calc.metaDescription,
        searchText,
      };
    }),
  }));
}

export default function CalculatorsIndexPage() {
  const groups = buildSearchGroups();

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

        <CalculatorsIndexSearch groups={groups} />

        <nav className="mt-10 flex flex-wrap gap-3 text-sm" aria-label="Liittyvät sivut">
          <Link
            href="/palvelut"
            className="inline-flex min-h-[2.75rem] items-center rounded-lg border border-stone-200 bg-white px-4 py-2 font-medium text-sky-800 hover:bg-sky-50"
          >
            Palvelut ja kilpailutus
          </Link>
          <Link
            href="/vian-selvitys"
            className="inline-flex min-h-[2.75rem] items-center rounded-lg border border-stone-200 bg-white px-4 py-2 font-medium text-sky-800 hover:bg-sky-50"
          >
            Lämpöpumpun vian selvitys
          </Link>
          <Link
            href="/tarjouspyynnot"
            className="inline-flex min-h-[2.75rem] items-center rounded-lg border border-stone-200 bg-white px-4 py-2 font-medium text-sky-800 hover:bg-sky-50"
          >
            Avoimet tarjouspyynnöt
          </Link>
        </nav>

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
