import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { brand } from "@/lib/brand-theme";
import { pageMetadata } from "@/lib/seo";
import { seoDefByPath } from "@/lib/seo-pages";

const seo = seoDefByPath("/laskurit")!;

export const metadata: Metadata = pageMetadata({
  title: seo.title,
  description: seo.description,
  path: "/laskurit",
  keywords: seo.keywords,
});

const CALCULATORS = [
  {
    href: "/laskurit/kylpyhuoneremontti",
    title: "Kylpyhuoneremontin hintalaskuri",
    description:
      "Arvioi purku, vesieristys, laatoitus, LVI ja kalusteet. Lisää omia kuluja ja kilpailuta lopullinen hinta.",
    badge: "Uusi",
  },
] as const;

export default function CalculatorsIndexPage() {
  return (
    <div className={brand.page}>
      <SiteHeader />
      <main className={brand.mainWide}>
        <Link href="/" className="text-sm text-sky-700 hover:underline">
          ← Etusivu
        </Link>

        <h1 className="mt-4 text-2xl font-bold sm:text-3xl">Remonttilaskurit</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600">
          Interaktiiviset hinta-arviot remontin suunnitteluun. Laskurit perustuvat
          suomalaisiin keskiarvoihin — tarkan hinnan saat kilpailuttamalla
          urakoitsijat ilmaiseksi.
        </p>

        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {CALCULATORS.map((calc) => (
            <li key={calc.href}>
              <Link
                href={calc.href}
                className="block h-full rounded-2xl border border-stone-200 bg-white p-5 transition hover:border-sky-300 hover:shadow-md"
              >
                {calc.badge && (
                  <span className="mb-2 inline-block rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-orange-800">
                    {calc.badge}
                  </span>
                )}
                <p className="font-semibold text-stone-900">{calc.title}</p>
                <p className="mt-2 text-sm text-stone-600">{calc.description}</p>
                <p className="mt-3 text-sm font-medium text-sky-700">
                  Avaa laskuri →
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
