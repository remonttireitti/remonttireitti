import Link from "next/link";
import { brand } from "@/lib/brand-theme";
import { marketplaceBrand } from "@/lib/marketplace-brand";

/**
 * Yhteisöllisyys ja vapaaehtoinen apu — erillinen maksullisista palveluista.
 */
export function HomeCommunitySection() {
  return (
    <section
      className="border-t border-rose-100/80 bg-gradient-to-b from-rose-50/40 via-white to-emerald-50/30 py-14 sm:py-16"
      aria-labelledby="community-heading"
    >
      <div className={brand.containerWide}>
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-medium uppercase tracking-widest text-rose-700">
            Yhteisöä, ei vain kauppaa
          </p>
          <h2
            id="community-heading"
            className="mt-2 text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl"
          >
            Hyviä ihmisiä on vielä olemassa
          </h2>
          <p className="mt-4 text-base leading-relaxed text-stone-600 sm:text-lg">
            Kaikkeen ei tarvitse maksaa heti ammattilaiselle. Pienessä hädässä —
            kantaminen, siirtäminen, ylijäämätavara — naapurit ja paikalliset
            auttavat usein mielellään ilmaiseksi. Hyvä teko synnyttää hyvää.
          </p>
        </div>

        <div className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-2 sm:gap-6">
          <Link
            href="/apu"
            className="group flex flex-col rounded-2xl border border-rose-200 bg-white p-6 text-left shadow-sm transition hover:border-rose-300 hover:shadow-md"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-rose-800">
              Pieni apu · 0 €
            </p>
            <h3 className="mt-2 text-xl font-bold text-stone-900 group-hover:text-rose-900">
              Tarvitsetko pientä apua?
            </h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-stone-600">
              Pyydä naapurilta tai paikalliselta yritykseltä apua kantamisessa,
              siirtämisessä ja muissa pienissä hommissa. Vapaaehtoista — ei
              tarjouksia eikä hintaa.
            </p>
            <span className="mt-4 text-sm font-semibold text-rose-800 group-hover:underline">
              Avaa Pieni apu →
            </span>
          </Link>

          <Link
            href="/markkinapaikka/ilmoitukset?tyyppi=lahjoitus"
            className="group flex flex-col rounded-2xl border border-emerald-200 bg-white p-6 text-left shadow-sm transition hover:border-emerald-300 hover:shadow-md"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
              {marketplaceBrand.nameShort} · lahjoitus
            </p>
            <h3 className="mt-2 text-xl font-bold text-stone-900 group-hover:text-emerald-900">
              Annetaan ilmaiseksi
            </h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-stone-600">
              Ylijäämätavara, varaosat ja tarvikkeet remontista — jaetaan
              ilmaiseksi yhteisölle. Myös yrityksille maksuton ilmoitus.
            </p>
            <span className="mt-4 text-sm font-semibold text-emerald-800 group-hover:underline">
              Selaa lahjoituksia →
            </span>
          </Link>
        </div>

        <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-stone-500">
          Remonttiin tarvitset silti ammattilaisen?{" "}
          <Link href="/remontti/uusi" className="font-medium text-sky-700 hover:underline">
            Kilpailuta työ erikseen
          </Link>
          — se on eri palvelu.
        </p>
      </div>
    </section>
  );
}
