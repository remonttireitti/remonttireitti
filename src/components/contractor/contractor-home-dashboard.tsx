import Link from "next/link";
import { ContractorOffersTable } from "@/components/contractor/contractor-offers-table";
import { ContractorProjectsTable } from "@/components/contractor/contractor-projects-table";
import { brand } from "@/lib/brand-theme";
import type { ContractorDashboardData } from "@/lib/contractor-dashboard-server";
import { contractorQuoteHubPath } from "@/lib/contractor-quote-paths";

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-stone-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-stone-500">{hint}</p>}
    </div>
  );
}

function offerHint(dashboard: ContractorDashboardData): string {
  const { stats, recentOffers } = dashboard;
  const hasCalculator = recentOffers.some((o) => o.source === "calculator");
  const hasMarketplace = recentOffers.some((o) => o.source === "marketplace");

  if (stats.waitingCount > 0) {
    // Vain status Lähetetty (laskuri) + submitted (RR) — ei luonnoksia.
    const n = stats.waitingCount;
    return n === 1
      ? "1 tarjous odottaa asiakkaan päätöstä (Lähetetty)"
      : `${n} tarjousta odottaa asiakkaan päätöstä (Lähetetty)`;
  }

  if (hasCalculator && hasMarketplace) {
    return "Viimeisimmät Remonttireitti- ja laskuritarjouksesi";
  }
  if (hasCalculator) {
    return "Viimeisimmät tarjouslaskurin tarjouksesi";
  }
  return "Viimeisimmät Remonttireitti-tarjouksesi";
}

export function ContractorHomeDashboard({
  companyName,
  contractorId,
  dashboard,
}: {
  companyName: string | null;
  contractorId: string;
  dashboard: ContractorDashboardData;
}) {
  const { recommendedProjects, recentOffers, bidProjectIds, stats } = dashboard;
  const hasOffers = recentOffers.length > 0;

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50/80 to-white p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-sky-800">
              Työpöytä
            </p>
            <h2 className="mt-1 text-xl font-bold text-stone-900 sm:text-2xl">
              {companyName ?? "Urakoitsija"}
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-stone-600">
              Sopivat tarjouspyynnöt, omat tarjoukset ja tilastot yhdellä
              silmäyksellä. Yrityksen asetukset löytyvät erilliseltä sivulta.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/tarjoukset" className={brand.btnPrimary}>
              Selaa tarjouspyyntöjä
            </Link>
            <Link href={contractorQuoteHubPath()} className={brand.btnSecondary}>
              Tarjouslaskuri
            </Link>
          </div>
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-stone-900">
              Sinulle sopivat tarjouspyynnöt
            </h3>
            <p className="mt-1 text-sm text-stone-500">
              {stats.openMatchCount > 0
                ? `${stats.openMatchCount} sopivaa pyyntöä alueellasi juuri nyt`
                : "Ei sopivia pyyntöjä alueellasi — laajenna hakua tai päivitä toiminta-aluetta"}
            </p>
          </div>
          <Link
            href="/tarjoukset"
            className="text-sm font-medium text-sky-800 hover:underline"
          >
            Näytä kaikki ({stats.openTotalCount}) →
          </Link>
        </div>

        {recommendedProjects.length === 0 ? (
          <div className={`${brand.section} mt-4 px-5 py-8 text-center`}>
            <p className="text-sm text-stone-600">
              Ei suodatettuja pyyntöjä juuri nyt.
            </p>
            <Link
              href="/tarjoukset?nayta=kaikki"
              className="mt-3 inline-block text-sm font-medium text-sky-800 hover:underline"
            >
              Selaa kaikkia avoimia pyyntöjä
            </Link>
          </div>
        ) : (
          <ContractorProjectsTable
            className="mt-4"
            projects={recommendedProjects}
            bidProjectIds={bidProjectIds}
            showBudgetWarning={false}
          />
        )}
      </section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-stone-900">
              Omat tarjoukset
            </h3>
            <p className="mt-1 text-sm text-stone-500">{offerHint(dashboard)}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href={contractorQuoteHubPath()}
              className="text-sm font-medium text-sky-800 hover:underline"
            >
              Tarjouslaskuri →
            </Link>
            <Link
              href="/tarjoukset?nayta=kaikki"
              className="text-sm font-medium text-sky-800 hover:underline"
            >
              Avoimet pyynnöt →
            </Link>
          </div>
        </div>

        {!hasOffers ? (
          <div className={`${brand.section} mt-4 px-5 py-8 text-center`}>
            <p className="text-sm text-stone-600">
              Ei vielä tarjouksia. Lähetä tarjous Remonttireitin pyyntöön tai
              luo oma tarjous laskurilla.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <Link href="/tarjoukset" className={`${brand.btnPrimary} inline-flex`}>
                Selaa tarjouspyyntöjä
              </Link>
              <Link
                href={contractorQuoteHubPath()}
                className={`${brand.btnSecondary} inline-flex`}
              >
                Avaa tarjouslaskuri
              </Link>
            </div>
          </div>
        ) : (
          <ContractorOffersTable className="mt-4" offers={recentOffers} />
        )}
      </section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-stone-900">Tilastot</h3>
            <p className="mt-1 text-sm text-stone-500">
              Remonttireitti ja tarjouslaskuri erikseen, plus yhdistetty kokonaisluku
            </p>
          </div>
          <Link
            href={`/urakoitsija/${contractorId}`}
            className="text-sm font-medium text-sky-800 hover:underline"
          >
            Julkinen profiili →
          </Link>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            label="Remonttireitti"
            value={String(stats.marketplaceCount)}
            hint="Tarjouspyynnöt alustalla"
          />
          <StatCard
            label="Tarjouslaskuri"
            value={String(stats.calculatorCount)}
            hint="Omat asiakkaat / PDF"
          />
          <StatCard
            label="Yhteensä"
            value={String(stats.submittedCount)}
            hint="Remonttireitti + laskuri"
          />
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            label="Tilatut / hyväksytyt"
            value={String(stats.acceptedCount)}
          />
          <StatCard
            label="Tilausprosentti"
            value={
              stats.conversionPercent != null
                ? `${stats.conversionPercent.toLocaleString("fi-FI")} %`
                : "—"
            }
            hint={
              stats.sentCount < 10
                ? "Luotettava luku muodostuu 10 lähetetyn tarjouksen jälkeen"
                : undefined
            }
          />
          <StatCard
            label="Sopivia pyyntöjä"
            value={String(stats.openMatchCount)}
            hint={`${stats.openTotalCount} avointa yhteensä`}
          />
        </div>
      </section>

      <section className={`${brand.section} p-5 sm:p-6`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className={brand.sectionTitle}>Yrityksen asetukset</h3>
            <p className="mt-2 text-sm leading-relaxed text-stone-600">
              Profiili, logo, hinnat, toiminta-alue, laskutus ja tarjousten
              oletusehdot. Nämä eivät ole päivittäisen työn ytimessä — päivitä
              tarvittaessa.
            </p>
          </div>
          <Link href="/oma-tili/yritys" className={brand.btnSecondary}>
            Avaa yrityksen asetukset
          </Link>
        </div>
      </section>
    </div>
  );
}
