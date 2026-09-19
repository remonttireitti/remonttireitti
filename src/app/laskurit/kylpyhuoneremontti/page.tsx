import type { Metadata } from "next";
import Link from "next/link";
import { BathroomRenovationCalculator } from "@/components/calculator/bathroom-renovation-calculator";
import { CostBreakdownChart } from "@/components/calculator/cost-breakdown-chart";
import { BathroomCalculatorJsonLd } from "@/components/seo/calculator-json-ld";
import { SiteHeader } from "@/components/site-header";
import { brand } from "@/lib/brand-theme";
import { TYPICAL_BREAKDOWN_5SQM } from "@/lib/bathroom-calculator";
import { pageMetadata } from "@/lib/seo";
import { seoDefByPath } from "@/lib/seo-pages";

const seo = seoDefByPath("/laskurit/kylpyhuoneremontti")!;

export const metadata: Metadata = pageMetadata({
  title: seo.title,
  description: seo.description,
  path: "/laskurit/kylpyhuoneremontti",
  keywords: seo.keywords,
});

const FAQ = [
  {
    q: "Paljonko kylpyhuoneremontti maksaa neliöltä?",
    a: "Täysremontin neliöhinta on Suomessa tyypillisesti 900–2 000 € lattia-neliöltä. Pienessä 3–5 m² kylpyhuoneessa kokonaishinta on usein 6 000–15 000 € riippuen materiaaleista ja putkien uusimisesta.",
  },
  {
    q: "Mitä maksaa kylpyhuoneen vesieristys?",
    a: "Pelkkä vesieristys maksaa yleensä 500–2 500 €. Yhdessä laatoituksen kanssa 2 000–5 000 €. Vesieristys on kriittinen vaihe ja vaatii sertifioidun tekijän.",
  },
  {
    q: "Miten laskuri laskee hinnan?",
    a: "Syötät lattian neliömäärän. Jokainen kustannusrivi kerrotaan lattia-m²:llä tai on kiinteä summa (LVI, kalusteet). Voit muokata hintoja, poistaa rivejä ja lisätä omia kuluja.",
  },
  {
    q: "Voinko saada tarkan tarjouksen?",
    a: "Kyllä — jätä ilmainen tarjouspyyntö Remonttireitillä. Urakoitsijat näkevät työn laajuuden ja vastaavat alueellisilla hinnoilla. Tarjouspyyntö onnistuu ilman tiliä.",
  },
] as const;

export default function BathroomCalculatorPage() {
  return (
    <div className={brand.page}>
      <BathroomCalculatorJsonLd />
      <SiteHeader />
      <main className={brand.mainWide}>
        <nav className="text-sm text-stone-500">
          <Link href="/" className="text-sky-700 hover:underline">
            Etusivu
          </Link>
          {" · "}
          <Link href="/laskurit" className="text-sky-700 hover:underline">
            Laskurit
          </Link>
        </nav>

        <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
          Kylpyhuoneremontti laskuri — arvioi remontin hinta
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-stone-600">
          Etsitkö arviota kylpyhuoneremontin kustannuksista? Tällä laskurilla
          näet, mistä hinta muodostuu: purku, vesieristys, laatoitus, LVI ja
          kalusteet. Hinnat perustuvat suomalaisiin keskiarvoihin (2026) — muokkaa
          rivejä ja lisää omia kuluja tarpeen mukaan.
        </p>

        <section className="mt-10">
          <CostBreakdownChart
            segments={[...TYPICAL_BREAKDOWN_5SQM]}
            title="Tyypillinen kustannusjako (5 m² kylpyhuone)"
            subtitle="Esimerkki täysremontista ~9 750–12 000 €. Alla voit laskea oman arvion."
          />
        </section>

        <div className="mt-10">
          <BathroomRenovationCalculator />
        </div>

        <section className={`${brand.section} mt-12 p-6`}>
          <h2 className="text-xl font-bold text-stone-900">
            Miten kylpyhuoneremontin hinta muodostuu?
          </h2>
          <div className="mt-4 space-y-4 text-sm leading-relaxed text-stone-700">
            <p>
              Kylpyhuoneremontin suurimmat kustannuserät ovat tyypillisesti{" "}
              <strong>laatoitus</strong> (työ + materiaalit),{" "}
              <strong>LVI- ja sähkötyöt</strong> sekä <strong>vesieristys</strong>.
              Purkutyöt ovat pienempi osuus, mutta niissä on usein kiinteä
              minimihinta pienissä kohteissa.
            </p>
            <p>
              Neliöhinta nousee, jos siirretään lattiakaivoa tai vesipisteitä,
              tarvitaan rakenteellisia muutoksia tai valitaan premium-laatat.
              Kerrostalossa taloyhtiön vastuut (esim. putkistot) vaikuttavat myös
              loppusummaan.
            </p>
            <p>
              Kotitalousvähennyksellä voit saada 35 % (2026) työn osuudesta takaisin
              verotuksessa — laskurin summa on ennen vähennystä.
            </p>
          </div>
          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <Link href="/palvelut/kylpyhuone" className={brand.link}>
              Kylpyhuoneremontti — palvelusivu →
            </Link>
            <Link href="/hinta-arkisto?tyo=kylpyhuone" className={brand.link}>
              Toteutuneet hinnat →
            </Link>
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-xl font-bold text-stone-900">Usein kysyttyä</h2>
          <ul className="mt-4 space-y-3">
            {FAQ.map((item) => (
              <li key={item.q}>
                <details className="rounded-xl border border-stone-200 bg-white">
                  <summary className="cursor-pointer px-4 py-3 font-medium text-stone-900">
                    {item.q}
                  </summary>
                  <p className="border-t border-stone-100 px-4 py-3 text-sm text-stone-600">
                    {item.a}
                  </p>
                </details>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
