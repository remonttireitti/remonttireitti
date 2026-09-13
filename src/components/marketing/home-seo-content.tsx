import Link from "next/link";
import { SeoFigure } from "@/components/marketing/seo-figure";
import { brand } from "@/lib/brand-theme";

const VISUALS = [
  {
    src: "/marketing/kilpailuta-remontti-tarjouspyynto.svg",
    alt: "Omakotitalon remontin tarjouspyyntö — kuvaus, kuvat ja budjetti yhdessä lomakkeessa",
    title: "Kilpailuta remontti ilmaiseksi — tee selkeä tarjouspyyntö",
    caption:
      "Kuvaile remontti kerran: kohde, työn laajuus ja kuvat. Urakoitsijat tarjoavat samoilla lähtötiedoilla.",
    width: 800,
    height: 520,
  },
  {
    src: "/marketing/vertaa-remonttitarjouksia.svg",
    alt: "Useita remonttitarjouksia vertailussa — hinta, takuu ja aikataulu samassa muodossa",
    title: "Vertaa remonttitarjouksia ja tingaa vastatarjouksella",
    caption:
      "Tarjoukset ovat vertailukelpoisia. Voit ehdottaa alhaisempaa hintaa vastatarjouksella ennen valintaa.",
    width: 800,
    height: 520,
  },
  {
    src: "/marketing/lampopumpun-vian-selvitys.svg",
    alt: "Lämpöpumpun vian selvitys — tarkista oire itse ennen huoltokäyntiä",
    title: "Lämpöpumppu oireilee? Ilmainen vian selvitys ennen huoltoa",
    caption:
      "Valitse pumpputyyppi ja oire — saat tarkistuslistan. Tarvittaessa kilpailuta huolto alueellasi.",
    width: 800,
    height: 520,
  },
] as const;

export function HomeSeoContent() {
  return (
    <section
      className="border-t border-stone-200 bg-stone-50 py-14 sm:py-16"
      aria-labelledby="home-seo-content-heading"
    >
      <div className={brand.containerWide}>
        <div className="max-w-3xl">
          <h2
            id="home-seo-content-heading"
            className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl"
          >
            Kilpailuta remontti yhdellä tarjouspyynnöllä
          </h2>
          <p className="mt-4 text-base leading-relaxed text-stone-700">
            Hyvä remontin kilpailutus alkaa siitä, että kaikille urakoitsijoille
            annetaan samat kohdetiedot. Remonttireitissä kuvaat remontin kerran,
            saat useita tarjouksia samassa muodossa ja voit vertailla rauhassa —
            ilman että soitat erikseen jokaiselle yritykselle.
          </p>
          <p className="mt-4 text-base leading-relaxed text-stone-700">
            Remontin hintaan vaikuttavat kohteen koko ja sijainti, työn laajuus,
            materiaalit, lähtötilanne ja aikataulu. Siksi yksittäinen nettihinta
            ei ole vielä tarjous. Tarjouspyyntö auttaa urakoitsijaa arvioimaan
            työn tarkemmin — ja sinua vertailemaan omenat omenoiksi.
          </p>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {VISUALS.map((visual) => (
            <SeoFigure key={visual.src} {...visual} />
          ))}
        </div>

        <div className="mt-10 max-w-3xl rounded-2xl border border-sky-100 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-stone-900">
            Hyvässä remonttitarjouksessa näkyvät
          </h3>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-stone-700">
            <li>• mitkä työt ja materiaalit sisältyvät hintaan</li>
            <li>• mitkä työt on rajattu tarjouksen ulkopuolelle</li>
            <li>• onko hinta kiinteä vai arvio</li>
            <li>• työn arvioitu aloitus, kesto ja takuu</li>
          </ul>
          <p className="mt-4 text-sm text-stone-600">
            <Link href="/remontti/uusi" className={brand.link}>
              Aloita ilmainen tarjouspyyntö →
            </Link>
            {" · "}
            <Link href="/palvelut" className={brand.link}>
              Selaa palveluja →
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
