import Link from "next/link";
import { BetaPlatformFeeBanner } from "@/components/promo/beta-platform-fee-banner";
import { brand } from "@/lib/brand-theme";

export function HomeAudienceSplit() {
  return (
    <div className="mx-auto mt-10 max-w-3xl">
      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/asiakkaalle"
          className="group rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50/80 to-white p-6 text-left shadow-sm transition hover:border-sky-300 hover:shadow-md"
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-sky-800">
            Asiakkaalle — ilmaista
          </p>
          <h2 className="mt-2 text-xl font-bold text-stone-900 group-hover:text-sky-900">
            Etsin tekijää
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-stone-600">
            Kilpailuta remontit ja palvelut, selvitä lämpöpumpun vikat, vertaa
            tarjouksia, tingaa hintaa, pidä huoltokirjaa ja käytä toria — sinulle
            0 €.
          </p>
          <ul className="mt-3 space-y-1 text-xs text-stone-600">
            <li>✓ Remontit, piha, siivous, muutto</li>
            <li>✓ Vian selvitys ja huolto</li>
            <li>✓ Arvostelut ja hinta-arkisto</li>
          </ul>
          <span className={`mt-4 inline-block text-sm font-semibold ${brand.link}`}>
            Katso kaikki mitä saat →
          </span>
        </Link>

        <div className="flex flex-col gap-3">
          <Link
            href="/urakoitsijaksi"
            className="group flex-1 rounded-2xl border border-orange-200 bg-white p-6 text-left shadow-sm transition hover:border-orange-300 hover:shadow-md"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-orange-800">
              Urakoitsijalle
            </p>
            <h2 className="mt-2 text-xl font-bold text-stone-900 group-hover:text-orange-900">
              Haen uusia töitä
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-stone-600">
              Remontit, huollot ja jatkuvat palvelut — ilmoitukset valitsemillesi
              ammateille. Kuukausitilaus tai maksu per diili.
            </p>
            <span className="mt-4 inline-block text-sm font-semibold text-orange-800 group-hover:underline">
              Lue lisää ja rekisteröidy →
            </span>
          </Link>
          <BetaPlatformFeeBanner showCta={false} className="text-left" />
        </div>
      </div>

      <ul className="mt-6 flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm text-stone-600">
        <li>
          <Link href="/palvelut#palvelut" className="text-sky-700 hover:underline">
            Siivous ja piha
          </Link>
        </li>
        <li aria-hidden className="text-stone-300">
          ·
        </li>
        <li>
          <Link href="/vian-selvitys" className="text-sky-700 hover:underline">
            Lämpöpumppu oireilee?
          </Link>
        </li>
        <li aria-hidden className="text-stone-300">
          ·
        </li>
        <li>
          <Link href="/huolto/uusi" className="text-sky-700 hover:underline">
            Huolto tai korjaus
          </Link>
        </li>
        <li aria-hidden className="text-stone-300">
          ·
        </li>
        <li>
          <Link href="/markkinapaikka" className="text-sky-700 hover:underline">
            Remonttitori
          </Link>
        </li>
      </ul>
    </div>
  );
}
