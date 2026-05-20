"use client";

import { useMemo, useState } from "react";
import {
  jobTypesForTrade,
  searchJobTypes,
  type JobCatalog,
  type JobTypeWithTrades,
  type Trade,
} from "@/types/job-catalog";

type Props = {
  catalog: JobCatalog;
  jobTypeId: string;
  tradeIds: string[];
  onJobTypeChange: (jobType: JobTypeWithTrades | null) => void;
  onTradeIdsChange: (ids: string[]) => void;
};

export function JobTypeStep({
  catalog,
  jobTypeId,
  tradeIds,
  onJobTypeChange,
  onTradeIdsChange,
}: Props) {
  const [query, setQuery] = useState("");
  const [browseTradeId, setBrowseTradeId] = useState<string | null>(null);
  const [mode, setMode] = useState<"search" | "browse">("search");

  const selectedJobType = useMemo(
    () => catalog.jobTypes.find((j) => j.id === jobTypeId) ?? null,
    [catalog.jobTypes, jobTypeId],
  );

  const searchResults = useMemo(() => {
    if (mode === "browse" && browseTradeId) {
      return jobTypesForTrade(browseTradeId, catalog.jobTypes);
    }
    if (query.trim().length < 2) {
      return catalog.jobTypes.slice(0, 12);
    }
    return searchJobTypes(query, catalog.jobTypes);
  }, [mode, browseTradeId, query, catalog.jobTypes]);

  const tradeById = useMemo(
    () => new Map(catalog.trades.map((t) => [t.id, t])),
    [catalog.trades],
  );

  function selectJobType(jt: JobTypeWithTrades) {
    onJobTypeChange(jt);
    onTradeIdsChange(
      jt.suggested_trade_ids.length > 0 ? [...jt.suggested_trade_ids] : [],
    );
    setQuery(jt.name_fi);
  }

  function toggleTrade(tradeId: string) {
    onTradeIdsChange(
      tradeIds.includes(tradeId)
        ? tradeIds.filter((id) => id !== tradeId)
        : [...tradeIds, tradeId],
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <ModeButton
          active={mode === "search"}
          onClick={() => {
            setMode("search");
            setBrowseTradeId(null);
          }}
        >
          Hae työtä
        </ModeButton>
        <ModeButton
          active={mode === "browse"}
          onClick={() => setMode("browse")}
        >
          Selaa ammateittain
        </ModeButton>
      </div>

      {mode === "search" ? (
        <div>
          <label htmlFor="job-search" className="block text-sm font-medium">
            Mitä remonttia tai asennusta tarvitset?
          </label>
          <input
            id="job-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Esim. lämpöpumppu, kattoremontti, sähkö, salaoja, terassi…"
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2.5 focus:border-sky-600 focus:outline-none focus:ring-1 focus:ring-sky-600"
            autoComplete="off"
          />
        </div>
      ) : (
        <div>
          <p className="text-sm font-medium text-stone-700">Valitse ammatti</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {catalog.trades.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setBrowseTradeId(t.id)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  browseTradeId === t.id
                    ? "bg-orange-700 text-white"
                    : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                }`}
              >
                {t.name_fi}
              </button>
            ))}
          </div>
          {browseTradeId && (
            <p className="mt-2 text-xs text-stone-500">
              Valitse työ alta — voit muokata ammatteja sen jälkeen.
            </p>
          )}
        </div>
      )}

      {(mode === "search" || browseTradeId) && (
        <ul className="max-h-80 space-y-2 overflow-y-auto rounded-xl border border-stone-200 bg-white p-2">
          {mode === "search" && query.trim().length < 2 && (
            <li className="px-2 py-1 text-xs text-stone-500">
              Suosittuja — tai kirjoita vähintään 2 merkkiä (esim. katto, putki, ikkuna).
            </li>
          )}
          {searchResults.length === 0 ? (
            <li className="px-2 py-3 text-sm text-stone-500">
              {mode === "browse"
                ? "Ei työkohteita tälle ammatille."
                : "Ei täsmääviä tuloksia. Kokeile lyhyempää sanaa tai selaa ammateittain."}
            </li>
          ) : (
            searchResults.map((jt) => (
              <li key={jt.id}>
                <button
                  type="button"
                  onClick={() => selectJobType(jt)}
                  className={`w-full rounded-lg px-3 py-2.5 text-left transition-colors ${
                    jobTypeId === jt.id
                      ? "bg-sky-50 ring-1 ring-sky-600"
                      : "hover:bg-stone-50"
                  }`}
                >
                  <span className="font-medium">{jt.name_fi}</span>
                  {jt.description_fi && (
                    <span className="mt-0.5 block text-sm text-stone-500">
                      {jt.description_fi}
                    </span>
                  )}
                  <SuggestedTradeChips
                    tradeIds={jt.suggested_trade_ids}
                    tradeById={tradeById}
                  />
                </button>
              </li>
            ))
          )}
        </ul>
      )}

      {selectedJobType && (
        <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-4">
          <p className="text-sm font-medium text-sky-950">
            Tarvitaan ammattilaiset (voit lisätä tai poistaa)
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {catalog.trades.map((t) => (
              <TradeChip
                key={t.id}
                trade={t}
                selected={tradeIds.includes(t.id)}
                required={selectedJobType.required_trade_ids.includes(t.id)}
                onToggle={() => toggleTrade(t.id)}
              />
            ))}
          </div>
          {tradeIds.length === 0 && (
            <p className="mt-2 text-xs text-amber-800">
              Valitse vähintään yksi ammatti.
            </p>
          )}
        </div>
      )}
          </div>
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
        active
          ? "bg-orange-700 text-white"
          : "bg-stone-100 text-stone-600 hover:bg-stone-200"
      }`}
    >
      {children}
    </button>
  );
}

function SuggestedTradeChips({
  tradeIds,
  tradeById,
}: {
  tradeIds: string[];
  tradeById: Map<string, Trade>;
}) {
  if (tradeIds.length === 0) return null;
  return (
    <span className="mt-2 flex flex-wrap gap-1">
      {tradeIds.map((id) => (
        <span
          key={id}
          className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600"
        >
          {tradeById.get(id)?.name_fi ?? "—"}
        </span>
      ))}
    </span>
  );
}

function TradeChip({
  trade,
  selected,
  required,
  onToggle,
}: {
  trade: Trade;
  selected: boolean;
  required: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
        selected
          ? "bg-orange-700 text-white"
          : "border border-stone-300 bg-white text-stone-700 hover:border-sky-400"
      }`}
    >
      {trade.name_fi}
      {required && !selected && (
        <span className="ml-1 text-xs opacity-70">(suositus)</span>
      )}
    </button>
  );
}
