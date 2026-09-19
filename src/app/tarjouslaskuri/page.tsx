import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { brand } from "@/lib/brand-theme";
import { canBrowseAsContractor } from "@/lib/admin-preview";
import { getSessionUser } from "@/lib/auth";
import {
  contractorQuoteCalculatorPath,
  contractorQuoteEditPath,
  contractorQuoteHubPath,
  contractorQuotePdfDownloadPath,
} from "@/lib/contractor-quote-paths";
import { ContractorQuoteOutcomeControl } from "@/components/contractor/contractor-quote-outcome-control";
import { ContractorQuoteStatsPanel } from "@/components/contractor/contractor-quote-stats-panel";
import { fetchContractorQuotePdfUsage } from "@/lib/contractor-quote-limits";
import { parseQuoteStatsPeriod } from "@/lib/contractor-quote-period";
import {
  fetchContractorQuoteStats,
  fetchContractorQuotesForStats,
} from "@/lib/contractor-quote-stats";
import { fetchContractorQuotes } from "@/lib/contractor-quote-server";
import { fetchContractorPricingRates } from "@/lib/contractor-pricing-server";
import { getCalculatorsGroupedByArea } from "@/lib/calculators/registry";
import { formatEuro } from "@/lib/calculators/math";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ContractorQuoteHubPage({
  searchParams,
}: {
  searchParams: Promise<{ jakso?: string }>;
}) {
  const { jakso } = await searchParams;
  const statsPeriod = parseQuoteStatsPeriod(jakso);
  const user = await getSessionUser();
  if (!user) {
    redirect(`/kirjaudu?redirect=${encodeURIComponent(contractorQuoteHubPath())}`);
  }

  if (!(await canBrowseAsContractor())) {
    redirect("/oma-tili?viesti=vain-urakoitsijalle");
  }

  const supabase = await createClient();
  const [pdfUsage, recentQuotes, rates, stats, printedQuotes] = await Promise.all([
    fetchContractorQuotePdfUsage(supabase, user.id),
    fetchContractorQuotes(supabase, user.id, 8),
    fetchContractorPricingRates(user.id),
    fetchContractorQuoteStats(supabase, user.id, statsPeriod),
    fetchContractorQuotesForStats(supabase, user.id, 12),
  ]);

  const groups = getCalculatorsGroupedByArea();

  return (
    <div className={brand.page}>
      <SiteHeader />
      <main className={`${brand.mainWide} mx-auto max-w-4xl`}>
        <p className="text-sm font-semibold uppercase tracking-wide text-sky-800">
          Urakoitsijan työkalu
        </p>
        <h1 className="mt-2 text-3xl font-bold text-stone-900">
          Tarjouslaskuri
        </h1>
        <p className="mt-2 max-w-2xl text-stone-600">
          Laske tarjous omille asiakkaillesi — sama moottori kuin Remonttireitin
          tarjouspyynnöissä.{" "}
          <strong>{pdfUsage.limit} tarjousta kuukaudessa maksutta</strong>{" "}
          (PDF-lataus). Suurempaan käyttöön hinnoittelu julkaistaan myöhemmin.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-sky-200 bg-sky-50/60 px-4 py-3">
            <p className="text-xs font-medium uppercase text-sky-800">
              PDF:tä jäljellä
            </p>
            <p className="mt-1 text-2xl font-bold text-sky-950">
              {pdfUsage.remaining} / {pdfUsage.limit}
            </p>
            <p className="text-xs text-sky-900/80">{pdfUsage.monthLabel}</p>
          </div>
          <div className="rounded-xl border border-stone-200 bg-white px-4 py-3 sm:col-span-2">
            <p className="text-xs font-medium uppercase text-stone-500">
              Omat hinnat
            </p>
            <p className="mt-1 text-sm text-stone-700">
              Työtunti {rates.hourlyRate} €/h · kate {rates.marginPercent} % ·{" "}
              <Link
                href="/oma-tili/yritys#laskentaparametrit"
                className="font-medium text-sky-800 hover:underline"
              >
                muokkaa laskentaparametreja
              </Link>
              {" · "}
              <Link
                href="/oma-tili/yritys#branding"
                className="font-medium text-sky-800 hover:underline"
              >
                logo ja esittely
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-8">
          <ContractorQuoteStatsPanel stats={stats} activePeriod={statsPeriod} />
        </div>

        {printedQuotes.length > 0 && (
          <section className="mt-8">
            <h2 className="text-lg font-semibold">Tulostetut tarjoukset</h2>
            <p className="mt-1 text-sm text-stone-600">
              Merkitse tilauskuittaus — näin näet käyttöasteen (lähetetty vs.
              tilattu).
            </p>
            <ul className="mt-3 divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white">
              {printedQuotes.map((quote) => (
                <li
                  key={quote.id}
                  className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-stone-900">{quote.title}</p>
                    <p className="text-sm text-stone-500">
                      {formatEuro(quote.total_cents / 100)}
                      {quote.client_name ? ` · ${quote.client_name}` : ""}
                      {quote.pdf_generated_at && (
                        <>
                          {" "}
                          · PDF{" "}
                          {new Date(quote.pdf_generated_at).toLocaleDateString(
                            "fi-FI",
                          )}
                        </>
                      )}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-3">
                      <Link
                        href={contractorQuoteEditPath(
                          quote.calculator_slug,
                          quote.id,
                        )}
                        className="text-sm font-medium text-sky-800 hover:underline"
                      >
                        Muokkaa
                      </Link>
                      <Link
                        href={contractorQuotePdfDownloadPath(quote.id)}
                        className="text-sm font-medium text-emerald-800 hover:underline"
                      >
                        Lataa PDF uudelleen
                      </Link>
                    </div>
                  </div>
                  <ContractorQuoteOutcomeControl quote={quote} />
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-10">
          <h2 className="text-lg font-semibold">Valitse laskuri</h2>
          <div className="mt-4 space-y-8">
            {groups.map((group) => (
              <div key={group.areaSlug}>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
                  {group.areaTitle}
                </h3>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {group.calculators.map((calc) => (
                    <li key={calc.slug}>
                      <Link
                        href={contractorQuoteCalculatorPath(calc.slug)}
                        className="block rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-900 hover:border-sky-300 hover:bg-sky-50/50"
                      >
                        {calc.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {recentQuotes.length > 0 && (
          <section className="mt-10">
            <h2 className="text-lg font-semibold">Viimeisimmät tarjoukset</h2>
            <ul className="mt-3 divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white">
              {recentQuotes.map((quote) => (
                <li
                  key={quote.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium text-stone-900">{quote.title}</p>
                    <p className="text-stone-500">
                      {formatEuro(quote.total_cents / 100)}
                      {quote.client_name ? ` · ${quote.client_name}` : ""}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Link
                      href={contractorQuoteEditPath(
                        quote.calculator_slug,
                        quote.id,
                      )}
                      className="text-sky-800 hover:underline"
                    >
                      Muokkaa
                    </Link>
                    <Link
                      href={contractorQuotePdfDownloadPath(quote.id)}
                      className="text-emerald-800 hover:underline"
                    >
                      {quote.pdf_generated_at ? "PDF uudelleen" : "Lataa PDF"}
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <aside className="mt-10 rounded-xl border border-stone-200 bg-stone-50/80 px-4 py-4 text-sm leading-relaxed text-stone-600">
          <strong className="text-stone-800">Miksi ilmainen?</strong> Jokainen
          tarjous auttaa parantamaan laskureita. Anonymisoituja tietoja voidaan
          käyttää hintaluokkien ja laskentamallien kehittämiseen — kerro tämä
          myös asiakkaallesi, jos haluat. Remonttireitin tarjouspyynnöistä
          oppiva data pysyy alustan erityisenä etuna.
        </aside>
      </main>
    </div>
  );
}
