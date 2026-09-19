import type { Metadata } from "next";
import Link from "next/link";
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
      <SiteHeader />
      <main className={brand.mainWide}>
        <Link href="/" className="text-sm text-sky-700 hover:underline">
          ← Etusivu
        </Link>

        <h1 className="mt-4 text-2xl font-bold sm:text-3xl">Remonttilaskurit</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600">
          Interaktiiviset hinta-arviot remontin suunnitteluun — jokaisella alueella
          omat laskurit viitehinnoilla ja työnkuvauksilla. Muokkaa rivejä, lisää omia
          kuluja ja kilpailuta lopullinen hinta ilmaiseksi.
        </p>

        <div className="mt-10 space-y-10">
          {groups.map((group) => (
            <section key={group.areaSlug}>
              <h2 className="text-lg font-bold text-stone-900">{group.areaTitle}</h2>
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
        </div>
      </main>
    </div>
  );
}
