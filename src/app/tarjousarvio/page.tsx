import type { Metadata } from "next";
import Link from "next/link";
import { EvaluationRequestForm } from "@/components/bid-evaluation/evaluation-request-form";
import { SiteHeader } from "@/components/site-header";
import { brand } from "@/lib/brand-theme";
import { EvaluationPricingNotice } from "@/components/bid-evaluation/evaluation-pricing-notice";
import { IMPARTIALITY_NOTICE } from "@/lib/bid-evaluation";
import { fetchBidEvaluationSettings } from "@/lib/bid-evaluation-server";
import { pageMetadata } from "@/lib/seo";
import { seoDefByPath } from "@/lib/seo-pages";
import { getSessionUser } from "@/lib/auth";
import {
  fetchActiveEvaluatorCategorySlugs,
  hasAnyActiveEvaluator,
} from "@/lib/bid-evaluation-availability-server";
import { createClient } from "@/lib/supabase/server";

const seo = seoDefByPath("/tarjousarvio")!;

export const metadata: Metadata = pageMetadata({
  title: seo.title,
  description: seo.description,
  path: "/tarjousarvio",
  keywords: seo.keywords,
});

const checks = [
  "Sopiiko laite kohteeseen?",
  "Sisältyvätkö asennus, sähköt ja kondenssivesi?",
  "Onko hinta normaalilla tasolla?",
  "Mitä kannattaa kysyä urakoitsijalta?",
];

export default async function TarjousarvioPage() {
  const user = await getSessionUser();
  const supabase = await createClient();
  const [settings, showTarjousvahti, availableCategories] = await Promise.all([
    fetchBidEvaluationSettings(supabase),
    hasAnyActiveEvaluator(),
    fetchActiveEvaluatorCategorySlugs(),
  ]);

  return (
    <div className={brand.page}>
      <SiteHeader />
      <main className={brand.mainContent}>
        <p className="text-sm font-medium uppercase tracking-wide text-sky-800">
          Tarjousvahti
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-stone-900">
          Ilmainen puolueeton tarjousarvio
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-stone-700">
          Et tiedä, onko tarjous järkevästi hinnoiteltu? Lähetä tarjoukset —
          alan ammattilainen arvioi ne ennen päätöstä. Aloitamme lämpöpumpuista.
        </p>

        <ul className="mt-6 grid gap-2 sm:grid-cols-2">
          {checks.map((c) => (
            <li key={c} className="flex gap-2 text-sm text-stone-700">
              <span className="text-sky-700" aria-hidden>
                ✓
              </span>
              {c}
            </li>
          ))}
        </ul>

        <p className="mt-6 max-w-2xl rounded-xl border border-violet-100 bg-violet-50/50 px-4 py-3 text-sm text-violet-950">
          {IMPARTIALITY_NOTICE}
        </p>

        <div className="mt-4 max-w-2xl">
          <EvaluationPricingNotice settings={settings} />
        </div>

        {!showTarjousvahti ? (
          <p className="mt-8 text-sm text-stone-600">
            Tarjousvahti ei ole tällä hetkellä saatavilla — arvioijia ei ole vielä
            rekisteröitynyt palveluun.
          </p>
        ) : user ? (
          <div className="mt-8">
            <EvaluationRequestForm
              availableCategories={availableCategories}
              defaultCategory={availableCategories[0] ?? "lammitys"}
            />
            <p className="mt-4 text-sm text-stone-600">
              <Link href="/tarjousarvio/omat" className={brand.link}>
                Omat arviopyynnöt →
              </Link>
            </p>
          </div>
        ) : (
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/kirjaudu?redirect=/tarjousarvio" className={brand.btnPrimary}>
              Kirjaudu ja lähetä tarjoukset
            </Link>
            <Link href="/rekisteroidy?redirect=/tarjousarvio" className={brand.btnSecondary}>
              Luo ilmainen tili
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
