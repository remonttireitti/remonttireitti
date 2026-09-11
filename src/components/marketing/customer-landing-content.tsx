import Link from "next/link";
import { ValuePromoBanner } from "@/components/promo/value-promo-banner";
import { brand } from "@/lib/brand-theme";
import {
  CUSTOMER_FREE_HIGHLIGHTS,
  CUSTOMER_OFFERINGS,
  type CustomerOffering,
} from "@/lib/customer-offerings";

const accentBorder: Record<CustomerOffering["accent"], string> = {
  sky: "border-sky-200 bg-gradient-to-br from-sky-50/80 to-white",
  emerald: "border-emerald-200 bg-gradient-to-br from-emerald-50/60 to-white",
  orange: "border-orange-200 bg-gradient-to-br from-orange-50/60 to-white",
  violet: "border-violet-200 bg-gradient-to-br from-violet-50/50 to-white",
  stone: "border-stone-200 bg-white",
};

function OfferingCard({ offering }: { offering: CustomerOffering }) {
  return (
    <article
      className={`flex flex-col rounded-2xl border p-5 shadow-sm transition hover:shadow-md ${accentBorder[offering.accent]}`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
        {offering.tagline}
      </p>
      <h3 className="mt-1 text-lg font-bold text-stone-900">{offering.title}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-stone-600">
        {offering.body}
      </p>
      <ul className="mt-3 space-y-1.5 text-sm text-stone-700">
        {offering.bullets.map((b) => (
          <li key={b} className="flex gap-2">
            <span className="text-sky-600" aria-hidden>
              ✓
            </span>
            {b}
          </li>
        ))}
      </ul>
      <Link
        href={offering.href}
        className={`${brand.link} mt-4 text-sm font-semibold`}
      >
        {offering.cta} →
      </Link>
    </article>
  );
}

export function CustomerLandingContent() {
  return (
    <>
      <section className="rounded-3xl border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-emerald-50/40 p-6 text-center shadow-sm sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-widest text-sky-800">
          Asiakkaalle — 100 % ilmaista
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
          Etsitkö tekijää kotiin?{" "}
          <span className="text-sky-800">Kaikki tämä on sinulle ilmaista.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-stone-600 sm:text-lg">
          Julkaise tarjouspyyntö, vertaa tarjouksia samassa muodossa ja tingaa
          vastatarjouksella — et maksa palvelulle mitään. Maksat vain
          valitsemallesi urakoitsijalle sovitun työn hinnan.
        </p>
        <ul className="mx-auto mt-6 flex max-w-2xl flex-wrap justify-center gap-2">
          {CUSTOMER_FREE_HIGHLIGHTS.map((item) => (
            <li
              key={item}
              className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-stone-800 shadow-sm ring-1 ring-sky-100 sm:text-sm"
            >
              {item}
            </li>
          ))}
        </ul>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/remontti/uusi"
            className={`${brand.btnPrimary} ${brand.btnPrimaryBlock}`}
          >
            Aloita ilmainen tarjouspyyntö
          </Link>
          <Link
            href="/palvelut"
            className={`${brand.btnSecondary} ${brand.btnSecondaryBlock}`}
          >
            Selaa palveluja
          </Link>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-bold tracking-tight text-stone-900">
          Mitä voit tehdä Remonttireitillä
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600">
          Yksi tili koko kodin tarpeisiin — remontista pihaan ja lämpöpumpun
          vian selvitykseen.
        </p>
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {CUSTOMER_OFFERINGS.map((offering) => (
            <OfferingCard key={offering.id} offering={offering} />
          ))}
        </div>
      </section>

      <section className="mt-12 rounded-2xl border border-stone-200 bg-white p-6 sm:p-8">
        <h2 className="text-xl font-bold text-stone-900">Näin se toimii</h2>
        <ol className="mt-6 grid gap-6 sm:grid-cols-3">
          {[
            {
              step: "1",
              title: "Kuvaile tarve",
              body: "Valitse remontti, palvelu tai oire. Lisää kuvat ja budjetti — mitä tarkemmin, sitä paremmat tarjoukset.",
            },
            {
              step: "2",
              title: "Vertaile tarjouksia",
              body: "Useita urakoitsijoita vastaa samassa muodossa. Voit tingata vastatarjouksella.",
            },
            {
              step: "3",
              title: "Valitse tekijä",
              body: "Hyväksy paras tarjous. Maksat työn urakoitsijalle — Remonttireitti ei veloita sinulta.",
            },
          ].map((s) => (
            <li key={s.step} className="flex gap-3">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sm font-bold text-sky-800"
                aria-hidden
              >
                {s.step}
              </span>
              <div>
                <p className="font-semibold text-stone-900">{s.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-stone-600">
                  {s.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        <ValuePromoBanner variant="customer-free" />
        <ValuePromoBanner variant="customer-negotiate" />
      </section>

      <section className="mt-10 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-6 text-center">
        <h2 className="text-lg font-bold text-stone-900">Valmis aloittamaan?</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm text-stone-600">
          Rekisteröidy tai kirjaudu, jotta voit tallentaa pyynnön ja vertailla
          tarjouksia. Itse palvelu pysyy ilmaisena.
        </p>
        <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/rekisteroidy" className={`${brand.btnPrimary} ${brand.btnPrimaryBlock}`}>
            Luo ilmainen tili
          </Link>
          <Link href="/remontti/uusi" className={`${brand.btnSecondary} ${brand.btnSecondaryBlock}`}>
            Jatka ilman tiliä → pyyntö
          </Link>
        </div>
      </section>
    </>
  );
}
