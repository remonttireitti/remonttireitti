import Link from "next/link";
import { ContractorProjectListItem } from "@/components/contractor/contractor-project-list-item";
import { brand } from "@/lib/brand-theme";
import { formatEurosFromCents } from "@/lib/bids";
import type {
  ContractorDashboardData,
  ContractorDashboardOffer,
} from "@/lib/contractor-dashboard-server";
import type { ContractorOpenProject } from "@/lib/contractor-projects-server";
import { contractorQuoteHubPath } from "@/lib/contractor-quote-paths";

const offerStatusBadgeStyles: Record<
  ContractorDashboardOffer["statusTone"],
  string
> = {
  sky: "bg-sky-100 text-sky-800",
  emerald: "bg-emerald-100 text-emerald-800",
  stone: "bg-stone-100 text-stone-600",
  amber: "bg-amber-50 text-amber-900",
};

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
  const calculatorInList = recentOffers.some((o) => o.source === "calculator");
  const parts: string[] = [];

  if (stats.activeBidCount > 0) {
    parts.push(
      `${stats.activeBidCount} Remonttireitti-tarjousta odottaa asiakkaan päätöstä`,
    );
  }
  if (calculatorInList) {
    parts.push("sisältää tarjouslaskurin tarjoukset");
  }
  if (parts.length > 0) return parts.join(" · ");
  return "Viimeisimmät Remonttireitti- ja laskuritarjouksesi";
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
          <ul className="mt-4 space-y-3">
            {recommendedProjects.map((project: ContractorOpenProject) => (
              <ContractorProjectListItem
                key={project.id}
                project={project}
                hasBid={bidProjectIds.has(project.id)}
                showBudgetWarning={false}
              />
            ))}
          </ul>
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
          <ul className="mt-4 space-y-3">
            {recentOffers.map((offer) => (
              <li key={offer.id}>
                <div
                  className={`${brand.section} p-4 transition hover:border-sky-200 hover:shadow-md sm:p-5`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={offer.href}
                          className="font-semibold text-stone-900 hover:text-sky-900 hover:underline"
                        >
                          {offer.title}
                        </Link>
                        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-600">
                          {offer.sourceLabel}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-stone-500">
                        {offer.locationLabel} ·{" "}
                        {formatEurosFromCents(offer.amount_cents)}
                        {offer.date && (
                          <>
                            {" · "}
                            {new Date(offer.date).toLocaleDateString("fi-FI")}
                          </>
                        )}
                      </p>
                      {offer.pdfHref && offer.pdfLabel && (
                        <p className="mt-2">
                          <Link
                            href={offer.pdfHref}
                            className="text-sm font-medium text-emerald-800 hover:underline"
                          >
                            {offer.pdfLabel}
                          </Link>
                        </p>
                      )}
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                        offerStatusBadgeStyles[offer.statusTone]
                      }`}
                    >
                      {offer.statusLabel}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-stone-900">Tilastot</h3>
            <p className="mt-1 text-sm text-stone-500">
              Yhteenveto Remonttireitti-tarjouksistasi
            </p>
          </div>
          <Link
            href={`/urakoitsija/${contractorId}`}
            className="text-sm font-medium text-sky-800 hover:underline"
          >
            Julkinen profiili →
          </Link>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Lähetetyt tarjoukset"
            value={String(stats.submittedCount)}
          />
          <StatCard
            label="Hyväksytyt"
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
              stats.submittedCount < 10
                ? "Luotettava luku muodostuu 10 tarjouksen jälkeen"
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
