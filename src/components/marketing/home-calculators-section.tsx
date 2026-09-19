import Link from "next/link";
import {
  FeaturedCalculatorCards,
  FeaturedCalculatorsCta,
} from "@/components/calculator/featured-calculator-cards";
import { brand } from "@/lib/brand-theme";

/** Etusivun pääsisältö: remonttilaskurit ennen tarjouspyyntöä. */
export function HomeCalculatorsSection() {
  return (
    <section
      id="laskurit"
      className="border-t border-violet-100/80 bg-gradient-to-b from-violet-50/50 via-white to-sky-50/30 py-14 sm:py-16"
      aria-labelledby="home-calculators-heading"
    >
      <div className={brand.containerWide}>
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-medium uppercase tracking-widest text-violet-800">
            Remontin hintalaskurit
          </p>
          <h2
            id="home-calculators-heading"
            className="mt-2 text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl"
          >
            Arvioi remonttisi kustannuksia ennen tarjouspyyntöä
          </h2>
          <p className="mt-4 text-base leading-relaxed text-stone-600 sm:text-lg">
            Ilmaiset interaktiiviset laskurit suomalaisilla viitehinnoilla. Muokkaa
            rivejä, näe kustannusjako — ja pyydä sitten oikeat tarjoukset alueeltasi.
          </p>
        </div>

        <FeaturedCalculatorCards className="mt-10" />

        <FeaturedCalculatorsCta />

        <p className="mx-auto mt-6 max-w-2xl text-center text-xs leading-relaxed text-stone-500">
          Laskurin arvio on suuntaa-antava. Lopullinen hinta riippuu kohteesta, alueesta
          ja työn laajuudesta —{" "}
          <Link href="/laskurit" className="font-medium text-violet-800 hover:underline">
            avaa kaikki laskurit
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
