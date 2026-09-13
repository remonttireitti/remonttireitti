import type { ComparisonInsightSummary } from "@/lib/bid-comparison-insights";
import { IMPARTIALITY_NOTICE } from "@/lib/bid-evaluation";

export function BidComparisonInsightsPanel({
  insights,
}: {
  insights: ComparisonInsightSummary;
}) {
  if (insights.bidInsights.length === 0) return null;

  return (
    <section className="mt-6 space-y-4">
      <div>
        <h3 className="text-base font-semibold text-stone-900">Vertailu-analyysi</h3>
        <p className="mt-1 text-sm text-stone-600">
          Automaattinen tarkistus tarjousten sisällöstä — ei urakoitsijasuositusta.
        </p>
      </div>

      {insights.highlights.length > 0 && (
        <ul className="space-y-2">
          {insights.highlights.map((line) => (
            <li
              key={line}
              className="rounded-xl border border-sky-100 bg-sky-50/70 px-4 py-3 text-sm text-sky-950"
            >
              {line}
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {insights.bidInsights.map((bid) => (
          <article
            key={bid.bidId}
            className="rounded-2xl border border-stone-200 bg-white p-4"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h4 className="font-semibold text-stone-900">{bid.bidLabel}</h4>
              <span className="text-sm font-medium text-stone-700">{bid.amountLabel}</span>
            </div>

            {bid.missingItems.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-red-800">
                  Puuttuu tai ei mainittu
                </p>
                <ul className="mt-1 space-y-0.5 text-sm text-stone-700">
                  {bid.missingItems.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
            )}

            {bid.partialItems.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                  Tarkista vielä
                </p>
                <ul className="mt-1 space-y-0.5 text-sm text-stone-700">
                  {bid.partialItems.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
            )}

            {bid.coveredItems.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
                  Mainittu tarjouksessa
                </p>
                <p className="mt-1 text-sm text-stone-700">
                  {bid.coveredItems.slice(0, 5).join(" · ")}
                </p>
              </div>
            )}
          </article>
        ))}
      </div>

      {insights.questionsForContractors.length > 0 && (
        <section className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
          <h4 className="font-semibold text-amber-950">
            Mitä kannattaa kysyä urakoitsijalta?
          </h4>
          <ul className="mt-2 space-y-1 text-sm text-amber-950">
            {insights.questionsForContractors.map((q) => (
              <li key={q}>• {q}</li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-xs text-stone-500">{IMPARTIALITY_NOTICE}</p>
    </section>
  );
}
