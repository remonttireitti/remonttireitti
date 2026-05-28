import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import {
  HEAT_PUMP_JOB_SLUGS,
  HEAT_PUMP_MARKETING,
} from "@/constants/heat-pumps";
import { brand } from "@/lib/brand-theme";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Lämpöpumpun vian selvitys",
  description:
    "Tarkista lämpöpumpun yleisimmät viat itse — ilmalämpö, vesi-ilmalämpö ja maalämpö. Jos ongelma ei ratkea, kilpailuta huolto ammattilaiselta.",
  path: "/vian-selvitys",
});

export default function TroubleshootingLandingPage() {
  return (
    <div className="min-h-full bg-stone-50 text-stone-900">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <Link href="/" className="text-sm text-sky-700 hover:underline">
          ← Etusivu
        </Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">
          Lämpöpumpun vian selvitys
        </h1>
        <p className="mt-3 text-stone-600">
          Valitse laitteesi tyyppi ja oire. Saat turvallisen tarkistuslistan. Jos
          vika ei poistu, voit pyytää tarjouksia huoltoon tai korjaukseen — oire
          ja kokeilemasi toimet siirtyvät automaattisesti pyyntöön.
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
        </p>
      </main>
    </div>
  );
}
