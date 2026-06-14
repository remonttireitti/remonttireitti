"use client";

import { tradeScopeHint, tradesForJobType } from "@/lib/project-trade-scope";
import type { JobCatalog, JobTypeWithTrades, Trade } from "@/types/job-catalog";

type ScopeEditorProps = {
  catalog: JobCatalog;
  jobType: JobTypeWithTrades;
  tradeIds: string[];
  onTradeIdsChange: (ids: string[]) => void;
};

export function ProjectTradeScopeEditor({
  catalog,
  jobType,
  tradeIds,
  onTradeIdsChange,
}: ScopeEditorProps) {
  const trades = tradesForJobType(catalog.trades, jobType);
  if (trades.length === 0) return null;

  function toggle(tradeId: string) {
    onTradeIdsChange(
      tradeIds.includes(tradeId)
        ? tradeIds.filter((id) => id !== tradeId)
        : [...tradeIds, tradeId],
    );
  }

  return (
    <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-4">
      <p className="text-sm font-medium text-sky-950">
        Mitä ammattilaisia tarvitaan?
      </p>
      <p className="mt-1 text-xs leading-relaxed text-sky-900/80">
        Valitse yksi päätyö (esim. kylpyhuone) — ilmoitus menee valittujen
        ammattien tekijöille. Poista valinta, jos kyseistä työtä ei tarvita.
      </p>
      <ul className="mt-3 space-y-2">
        {trades.map((trade) => {
          const selected = tradeIds.includes(trade.id);
          const hint = tradeScopeHint(trade.slug);
          return (
            <li key={trade.id}>
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-transparent bg-white/70 px-3 py-2.5 has-[:checked]:border-sky-300 has-[:checked]:bg-white">
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => toggle(trade.id)}
                  className="mt-0.5 size-4 rounded border-stone-300 text-sky-700 focus:ring-sky-600"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-stone-900">
                    {trade.name_fi}
                  </span>
                  {hint && (
                    <span className="mt-0.5 block text-xs text-stone-500">
                      {hint}
                    </span>
                  )}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      {tradeIds.length === 0 && (
        <p className="mt-2 text-xs text-amber-800" role="alert">
          Valitse vähintään yksi ammatti, jotta oikeat tekijät näkevät pyynnön.
        </p>
      )}
    </div>
  );
}

export function SuggestedTradeChips({
  trades,
}: {
  trades: Trade[];
}) {
  if (trades.length === 0) return null;
  return (
    <span className="mt-2 flex flex-wrap gap-1">
      {trades.map((trade) => (
        <span
          key={trade.id}
          className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600"
        >
          {trade.name_fi}
        </span>
      ))}
    </span>
  );
}

export function tradeNamesForSummary(
  catalog: JobCatalog,
  tradeIds: string[],
): string {
  if (tradeIds.length === 0) return "—";
  const byId = new Map(catalog.trades.map((t) => [t.id, t.name_fi]));
  return tradeIds
    .map((id) => byId.get(id))
    .filter(Boolean)
    .join(", ");
}

type AllTradesPickerProps = {
  catalog: JobCatalog;
  tradeIds: string[];
  onTradeIdsChange: (ids: string[]) => void;
};

/** Vapaamuotoisessa pyynnössä asiakas valitsee ammatit itse. */
export function ProjectAllTradesPicker({
  catalog,
  tradeIds,
  onTradeIdsChange,
}: AllTradesPickerProps) {
  function toggle(tradeId: string) {
    onTradeIdsChange(
      tradeIds.includes(tradeId)
        ? tradeIds.filter((id) => id !== tradeId)
        : [...tradeIds, tradeId],
    );
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
      <p className="text-sm font-medium text-amber-950">
        Ketkä ammattilaiset voivat nähdä pyynnön? *
      </p>
      <p className="mt-1 text-xs leading-relaxed text-amber-900/80">
        Valitse kaikki ammatit, joita remontti todennäköisesti tarvitsee. Voit
        valita useita.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {catalog.trades.map((trade) => {
          const selected = tradeIds.includes(trade.id);
          const hint = tradeScopeHint(trade.slug);
          return (
            <button
              key={trade.id}
              type="button"
              title={hint ?? undefined}
              onClick={() => toggle(trade.id)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                selected
                  ? "bg-amber-800 text-white"
                  : "border border-stone-300 bg-white text-stone-700 hover:border-amber-400"
              }`}
            >
              {trade.name_fi}
            </button>
          );
        })}
      </div>
      {tradeIds.length === 0 && (
        <p className="mt-2 text-xs text-amber-800" role="alert">
          Valitse vähintään yksi ammatti.
        </p>
      )}
    </div>
  );
}
