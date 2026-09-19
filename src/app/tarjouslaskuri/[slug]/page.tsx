import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { StandaloneQuoteWorkspace } from "@/components/contractor/standalone-quote-workspace";
import { SiteHeader } from "@/components/site-header";
import { brand } from "@/lib/brand-theme";
import { canBrowseAsContractor } from "@/lib/admin-preview";
import { getSessionUser } from "@/lib/auth";
import { fetchContractorBidDefaults } from "@/lib/contractor-bid-defaults-server";
import {
  clampQuoteValidityDays,
  formatQuoteTermsFromBidDefaults,
} from "@/lib/contractor-quote-defaults";
import {
  contractorQuoteCalculatorPath,
  contractorQuoteEditPath,
  contractorQuoteHubPath,
} from "@/lib/contractor-quote-paths";
import { fetchContractorQuotePdfUsage } from "@/lib/contractor-quote-limits";
import { fetchContractorQuote } from "@/lib/contractor-quote-server";
import { fetchContractorPricingRates } from "@/lib/contractor-pricing-server";
import { getCalculatorBySlug } from "@/lib/calculators/registry";
import { enrichCalculatorConfig } from "@/lib/calculators/resolve-with-learning";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ContractorQuoteCalculatorPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tarjous?: string }>;
}) {
  const { slug } = await params;
  const { tarjous: quoteIdParam } = await searchParams;
  const quoteId = quoteIdParam?.trim() || null;
  const user = await getSessionUser();
  if (!user) {
    const redirectTo = quoteId
      ? contractorQuoteEditPath(slug, quoteId)
      : contractorQuoteCalculatorPath(slug);
    redirect(`/kirjaudu?redirect=${encodeURIComponent(redirectTo)}`);
  }

  if (!(await canBrowseAsContractor())) {
    redirect("/oma-tili?viesti=vain-urakoitsijalle");
  }

  const baseConfig = getCalculatorBySlug(slug);
  if (!baseConfig) notFound();

  const supabase = await createClient();
  const jobSlug = baseConfig.jobSlug ?? null;

  const initialQuote = quoteId
    ? await fetchContractorQuote(supabase, quoteId, user.id)
    : null;

  if (quoteId && !initialQuote) {
    notFound();
  }

  if (
    initialQuote &&
    initialQuote.calculator_slug &&
    initialQuote.calculator_slug !== slug
  ) {
    redirect(
      contractorQuoteEditPath(initialQuote.calculator_slug, initialQuote.id),
    );
  }

  const [enriched, rates, pdfUsage, bidDefaults, profileRow] = await Promise.all([
    enrichCalculatorConfig(supabase, baseConfig),
    fetchContractorPricingRates(user.id),
    fetchContractorQuotePdfUsage(supabase, user.id),
    fetchContractorBidDefaults(user.id, jobSlug),
    supabase
      .from("contractor_profiles")
      .select("default_quote_validity_days")
      .eq("id", user.id)
      .maybeSingle()
      .then((r) => r.data),
  ]);
  const config = enriched.config;
  const defaultTerms = formatQuoteTermsFromBidDefaults(bidDefaults);
  const defaultValidityDays = clampQuoteValidityDays(
    profileRow?.default_quote_validity_days,
  );

  return (
    <div className={brand.page}>
      <SiteHeader />
      <main className={`${brand.mainWide} mx-auto max-w-4xl`}>
        <Link
          href={contractorQuoteHubPath()}
          className="text-sm text-sky-700 hover:underline"
        >
          ← Tarjouslaskuri
        </Link>
        <h1 className="mt-4 text-2xl font-bold">{config.title}</h1>
        {initialQuote ? (
          <p className="mt-1 text-sm text-stone-600">
            Muokkaat tallennettua tarjousta — asiakas- ja kohdetiedot ovat
            muokattavissa. {pdfUsage.remaining} / {pdfUsage.limit} PDF-tarjousta
            jäljellä ({pdfUsage.monthLabel})
          </p>
        ) : (
          <p className="mt-1 text-sm text-stone-600">
            {pdfUsage.remaining} / {pdfUsage.limit} PDF-tarjousta jäljellä (
            {pdfUsage.monthLabel})
          </p>
        )}

        <div className="mt-6">
          <StandaloneQuoteWorkspace
            config={config}
            rates={rates}
            pdfUsage={pdfUsage}
            jobSlug={jobSlug}
            defaultValidityDays={defaultValidityDays}
            defaultTerms={defaultTerms}
            initialQuote={initialQuote}
          />
        </div>
      </main>
    </div>
  );
}
