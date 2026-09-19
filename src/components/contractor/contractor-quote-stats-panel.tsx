import Link from "next/link";
import { formatEuro } from "@/lib/calculators/math";
import type { ContractorQuoteStats } from "@/lib/contractor-quote-stats";
import { contractorQuoteHubPath } from "@/lib/contractor-quote-paths";
import type { ContractorQuoteStatsPeriod } from "@/lib/contractor-quote-period";

function formatSum(cents: number): string {
  return formatEuro(cents / 100);
}

function StatBlock({
  label,
  count,
  sumCents,
  orderedCount,
  orderedSumCents,
  conversionPercent,
}: {
  label: string;
  count: number;
  sumCents: number;
  orderedCount: number;
  orderedSumCents: number;
  conversionPercent: number | null;
}) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
        {label}
      </p>
      <dl className="mt-3 grid gap-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-stone-600">Lähetetty</dt>
          <dd className="text-right font-medium tabular-nums">
            {count} kpl · {formatSum(sumCents)}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-stone-600">Tilattu</dt>
          <dd className="text-right font-medium tabular-nums text-emerald-800">
            {orderedCount} kpl · {formatSum(orderedSumCents)}
          </dd>
        </div>
        {conversionPercent != null && count > 0 && (
          <div className="flex justify-between gap-4 border-t border-stone-100 pt-2">
            <dt className="text-stone-600">Käyttöaste</dt>
            <dd className="text-right font-semibold tabular-nums">
              {conversionPercent.toLocaleString("fi-FI")} %
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
}

const PERIOD_TABS: { key: ContractorQuoteStatsPeriod; label: string; param: string }[] =
  [
    { key: "week", label: "Viikko", param: "viikko" },
    { key: "month", label: "Kuukausi", param: "kk" },
    { key: "year", label: "Vuosi", param: "vuosi" },
  ];

export function ContractorQuoteStatsPanel({
  stats,
  activePeriod,
}: {
  stats: ContractorQuoteStats;
  activePeriod: ContractorQuoteStatsPeriod;
}) {
  return (
    <section className="rounded-2xl border border-violet-200 bg-gradient-to-b from-violet-50/60 to-white p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-violet-950">Tarjousstatistiikka</h2>
          <p className="mt-1 text-sm text-stone-600">{stats.periodLabel}</p>
        </div>
        <nav
          className="inline-flex rounded-xl border border-stone-200 bg-white p-1"
          aria-label="Jakso"
        >
          {PERIOD_TABS.map((tab) => (
            <Link
              key={tab.key}
              href={`${contractorQuoteHubPath()}?jakso=${tab.param}`}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                activePeriod === tab.key
                  ? "bg-violet-100 text-violet-950"
                  : "text-stone-600 hover:bg-stone-50"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <StatBlock
          label="Remonttireitti"
          count={stats.remonttireitti.sentCount}
          sumCents={stats.remonttireitti.sentSumCents}
          orderedCount={stats.remonttireitti.orderedCount}
          orderedSumCents={stats.remonttireitti.orderedSumCents}
          conversionPercent={stats.remonttireitti.conversionPercent}
        />
        <StatBlock
          label="Tulostetut (oma asiakas)"
          count={stats.standalone.sentCount}
          sumCents={stats.standalone.sentSumCents}
          orderedCount={stats.standalone.orderedCount}
          orderedSumCents={stats.standalone.orderedSumCents}
          conversionPercent={stats.standalone.conversionPercent}
        />
        <StatBlock
          label="Yhteensä"
          count={stats.yhteensa.sentCount}
          sumCents={stats.yhteensa.sentSumCents}
          orderedCount={stats.yhteensa.orderedCount}
          orderedSumCents={stats.yhteensa.orderedSumCents}
          conversionPercent={stats.yhteensa.conversionPercent}
        />
      </div>

      {stats.standalone.pendingCount > 0 && (
        <p className="mt-4 text-sm text-amber-900">
          {stats.standalone.pendingCount} tulostettua tarjousta odottaa vielä
          tilauskuittausta — merkitse tila alla.
        </p>
      )}

      <p className="mt-3 text-xs text-stone-500">
        Remonttireitti: lähetetty = tarjouspyyntöön jätetty tarjous, tilattu =
        hyväksytty tarjous. Oma asiakas: lähetetty = PDF luotu, tilattu = olet
        merkinnyt urakan voitetuksi.
      </p>
    </section>
  );
}
