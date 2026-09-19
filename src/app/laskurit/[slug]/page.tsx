import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { ContractorCalculatorBanner } from "@/components/calculator/contractor-calculator-banner";
import { RenovationCalculator } from "@/components/calculator/renovation-calculator";
import { CostBreakdownChart } from "@/components/calculator/cost-breakdown-chart";
import { CalculatorJsonLd } from "@/components/seo/calculator-json-ld";
import { SiteHeader } from "@/components/site-header";
import { brand } from "@/lib/brand-theme";
import {
  getCalculatorBySlug,
  getCalculatorSlugs,
  getPreferredPublicSlug,
  publicCalculatorPath,
} from "@/lib/calculators/registry";
import { resolveCalculatorContent, resolvePriceRangeNote } from "@/lib/calculators/resolve";
import { enrichCalculatorConfig } from "@/lib/calculators/resolve-with-learning";
import { createClient } from "@/lib/supabase/server";
import { pageMetadata } from "@/lib/seo";
import { mergeKeywords, SITE_KEYWORDS, CALCULATOR_KEYWORDS } from "@/lib/seo-keywords";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getCalculatorSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const config = getCalculatorBySlug(slug);
  if (!config) {
    return pageMetadata({
      title: "Laskuri",
      description: "Remonttilaskuri",
      noIndex: true,
    });
  }

  const publicSlug = getPreferredPublicSlug(slug);
  return pageMetadata({
    title: config.pageTitle,
    description: config.metaDescription,
    path: publicCalculatorPath(publicSlug),
    keywords: mergeKeywords(SITE_KEYWORDS, CALCULATOR_KEYWORDS, [config.title]),
  });
}

export default async function CalculatorPage({ params }: Props) {
  const { slug } = await params;
  const baseConfig = getCalculatorBySlug(slug);
  if (!baseConfig) notFound();

  const publicSlug = getPreferredPublicSlug(slug);
  if (slug !== publicSlug) {
    permanentRedirect(publicCalculatorPath(publicSlug));
  }

  const supabase = await createClient();
  const { config, learnedRange } = await enrichCalculatorConfig(
    supabase,
    baseConfig,
  );

  const { faq } = resolveCalculatorContent(config);
  const priceRangeNote = resolvePriceRangeNote(config);
  const servicePath = `/palvelut/${config.jobSlug}`;

  return (
    <div className={brand.page}>
      <CalculatorJsonLd config={config} faq={faq} urlSlug={publicSlug} />
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
          {config.pageTitle}
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-stone-600">
          {config.intro}
        </p>
        <p className="mt-2 max-w-3xl text-sm text-stone-500">
          {priceRangeNote} Hinnat sis. ALV — suuntaa-antava arvio.
        </p>
        {learnedRange && (
          <p className="mt-2 max-w-3xl rounded-lg border border-sky-100 bg-sky-50/60 px-3 py-2 text-xs leading-relaxed text-sky-900">
            Hintahaarukka on päivitetty {learnedRange.sampleCount} toteutuneen
            urakan ja tarjouksen perusteella (mediaanipoikkeama{" "}
            {learnedRange.medianDeviationPercent > 0 ? "+" : ""}
            {learnedRange.medianDeviationPercent} %).
          </p>
        )}

        {config.typicalBreakdown && config.typicalBreakdown.length > 0 && (
          <section className="mt-10">
            <CostBreakdownChart
              segments={[...config.typicalBreakdown]}
              title={`Tyypillinen kustannusjako (${config.primaryInput.defaultValue} ${config.primaryInput.unit})`}
              subtitle="Esimerkki suomalaisista keskiarvoista (2025–2026). Alla voit laskea oman arvion."
            />
          </section>
        )}

        <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)] lg:items-start">
          <RenovationCalculator config={config} />
          <ContractorCalculatorBanner
            calculatorTitle={config.title}
            className="lg:sticky lg:top-24"
          />
        </div>

        <section className={`${brand.section} mt-12 p-6`}>
          <h2 className="text-xl font-bold text-stone-900">{config.scopeTitle}</h2>
          <div className="mt-4 space-y-4 text-sm leading-relaxed text-stone-700">
            {config.scopeParagraphs.map((p) => (
              <p key={p.slice(0, 40)}>{p}</p>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <Link href={servicePath} className={brand.link}>
              Palvelusivu →
            </Link>
            <Link
              href={`/hinta-arkisto?tyo=${config.priceArchiveParam ?? config.jobSlug}`}
              className={brand.link}
            >
              Toteutuneet hinnat →
            </Link>
          </div>
        </section>

        {faq.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xl font-bold text-stone-900">Usein kysyttyä</h2>
            <ul className="mt-4 space-y-3">
              {faq.map((item) => (
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
        )}
      </main>
    </div>
  );
}
