import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import {
  HEAT_PUMP_JOB_SLUGS,
  HEAT_PUMP_MARKETING,
} from "@/constants/heat-pumps";
import { brand } from "@/lib/brand-theme";
import { pageMetadata } from "@/lib/seo";
import { seoDefByPath } from "@/lib/seo-pages";

const seo = seoDefByPath("/vian-selvitys")!;

export const metadata: Metadata = pageMetadata({
  title: seo.title,
  description: seo.description,
  path: "/vian-selvitys",
  keywords: seo.keywords,
});

export default function TroubleshootingLandingPage() {
  return (
    <div className={brand.page}>
      <SiteHeader />
      <main className={brand.mainContent}>
        <Link href="/" className="text-sm text-sky-700 hover:underline">
          ← Etusivu
        </Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">
          Lämpöpumpun vian selvitys
        </h1>
        <p className="mt-2 text-lg text-stone-700">
          Ei huoltokäyntiä vielä — vain selkeä ohje oireeseen.
        </p>
        <p className="mt-3 text-stone-600">
          Valitse pumpputyyppi ja oire (esim. ei lämmitä, vuoto, virhekoodi).
          Näet mitä voit tarkistaa itse turvallisesti ja milloin kannattaa soittaa
          ammattilaiselle. Jos vika jää, siirry huoltopyyntöön — kokeilemasi
          kohdat menevät automaattisesti asentajalle.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-1">
          {HEAT_PUMP_JOB_SLUGS.map((slug) => {
            const m = HEAT_PUMP_MARKETING[slug];
            return (
              <Link
                key={slug}
                href={`/vian-selvitys/${slug}`}
                className="block rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:border-sky-300 hover:shadow-md"
              >
                <h2 className="text-lg font-semibold">{m.title}</h2>
                <p className="mt-1 text-sm text-stone-600">{m.description}</p>
                <span className={`mt-3 inline-block text-sm font-semibold ${brand.link}`}>
                  Valitse oire →
                </span>
              </Link>
            );
          })}
        </div>

        <p className="mt-8 text-sm text-stone-500">
          Uusi asennus?{" "}
          <Link href="/remontti/uusi" className="text-sky-700 hover:underline">
            Kilpailuta lämpöpumppuasennus
          </Link>
          {" · "}
          <Link href="/hinta-arkisto" className="text-sky-700 hover:underline">
            Katso hinta-arkisto
          </Link>
        </p>
      </main>
    </div>
  );
}
