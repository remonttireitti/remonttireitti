"use client";

import { useMemo, useState } from "react";
import { scopeCheckItemsForJob } from "@/lib/bid-comparison-insights";
import {
  analyzeBidAssistant,
  missingScopeItemIds,
  scopeSuggestionForItem,
} from "@/lib/bid-assistant";
import type { BidFormFields } from "@/lib/bid-form";
import type { ProjectQualityResult } from "@/lib/project-request-quality";

function scoreColor(score: number): string {
  if (score >= 90) return "text-emerald-700";
  if (score >= 75) return "text-sky-700";
  if (score >= 50) return "text-amber-700";
  return "text-red-700";
}

function ringColor(score: number): string {
  if (score >= 90) return "stroke-emerald-500";
  if (score >= 75) return "stroke-sky-500";
  if (score >= 50) return "stroke-amber-500";
  return "stroke-red-500";
}

export function BidAssistantPanel({
  fields,
  jobTypeSlug,
  projectQuality,
  onAppendScope,
}: {
  fields: BidFormFields;
  jobTypeSlug?: string | null;
  projectQuality?: ProjectQualityResult | null;
  onAppendScope: (text: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  const assistant = useMemo(
    () => analyzeBidAssistant(fields, jobTypeSlug ?? null, projectQuality),
    [fields, jobTypeSlug, projectQuality],
  );

  const missingIds = useMemo(
    () => missingScopeItemIds(jobTypeSlug ?? null, assistant.insight),
    [jobTypeSlug, assistant.insight],
  );

  const scopeItems = scopeCheckItemsForJob(jobTypeSlug ?? null);
  const hasIssues =
    assistant.insight.missingItems.length > 0 ||
    assistant.insight.partialItems.length > 0 ||
    assistant.projectGaps.length > 0;

  return (
    <aside className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start justify-between gap-3 text-left"
      >
        <div>
          <p className="text-sm font-semibold text-indigo-950">Tarjousavustaja</p>
          <p className="mt-1 text-xs leading-relaxed text-indigo-900/90">
            Tarkistaa tarjouksen selkeyden ennen lähetystä — asiakas vertailee
            helpommin, kun laajuus on kuvattu.
          </p>
        </div>
        <div className="relative flex size-14 shrink-0 items-center justify-center">
          <svg className="size-14 -rotate-90" viewBox="0 0 36 36" aria-hidden>
            <circle
              cx="18"
              cy="18"
              r="15.5"
              fill="none"
              className="stroke-indigo-200"
              strokeWidth="3"
            />
            <circle
              cx="18"
              cy="18"
              r="15.5"
              fill="none"
              className={ringColor(assistant.completenessScore)}
              strokeWidth="3"
              strokeDasharray={`${assistant.completenessScore} 100`}
              strokeLinecap="round"
            />
          </svg>
          <span
            className={`absolute text-xs font-bold ${scoreColor(assistant.completenessScore)}`}
          >
            {assistant.completenessScore}%
          </span>
        </div>
      </button>

      <p className={`mt-2 text-sm font-medium ${scoreColor(assistant.completenessScore)}`}>
        {assistant.completenessLabel}
      </p>

      {expanded && (
        <div className="mt-4 space-y-4 border-t border-indigo-100 pt-4">
          {assistant.insight.strengths.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
                Kunnossa
              </p>
              <ul className="mt-2 space-y-1">
                {assistant.insight.strengths.map((s) => (
                  <li key={s} className="text-xs text-emerald-900">
                    ✓ {s}
                  </li>
                ))}
                {assistant.insight.coveredItems.map((s) => (
                  <li key={s} className="text-xs text-emerald-900">
                    ✓ {s} mainittu
                  </li>
                ))}
              </ul>
            </div>
          )}

          {hasIssues && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">
                Täydennä tarjousta
              </p>
              <ul className="mt-2 space-y-2">
                {assistant.insight.missingItems.map((label) => {
                  const item = scopeItems.find((i) => i.label === label);
                  const itemId = item?.id ?? label;
                  return (
                    <li
                      key={label}
                      className="rounded-lg border border-amber-200/80 bg-white/80 px-3 py-2"
                    >
                      <p className="text-xs font-medium text-stone-900">{label}</p>
                      <p className="mt-0.5 text-xs text-stone-600">
                        Ei näy tarjouksen teksteissä — asiakas voi kysyä erikseen.
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          onAppendScope(scopeSuggestionForItem(itemId, label))
                        }
                        className="mt-2 text-xs font-medium text-indigo-800 hover:underline"
                      >
                        Lisää laajuuskenttään →
                      </button>
                    </li>
                  );
                })}
                {assistant.insight.partialItems.map((label) => {
                  const item = scopeItems.find((i) => i.label === label);
                  const itemId = item?.id ?? label;
                  return (
                    <li
                      key={`partial-${label}`}
                      className="rounded-lg border border-amber-100 bg-white/60 px-3 py-2"
                    >
                      <p className="text-xs font-medium text-stone-900">{label}</p>
                      <p className="mt-0.5 text-xs text-stone-600">
                        Mainittu vain osittain — tarkenna laajuuskentässä.
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          onAppendScope(scopeSuggestionForItem(itemId, label))
                        }
                        className="mt-2 text-xs font-medium text-indigo-800 hover:underline"
                      >
                        Täydennä laajuuskenttään →
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {assistant.projectGaps.length > 0 && (
            <div className="rounded-lg border border-violet-200 bg-violet-50/70 px-3 py-3">
              <p className="text-xs font-semibold text-violet-950">
                Tarjouspyynnössä puuttuu tietoja
              </p>
              <p className="mt-1 text-xs text-violet-900">
                Pyyntö on {projectQuality?.score ?? "—"} % valmis. Voit tarjota
                silti — tai pyytää asiakasta täydentämään alla olevia kohtia.
              </p>
              <ul className="mt-2 space-y-1">
                {assistant.projectGaps.map((gap) => (
                  <li key={gap.id} className="text-xs text-violet-900">
                    • {gap.label}
                    {gap.status === "partial" ? " (osittain)" : ""}
                  </li>
                ))}
              </ul>
              <a
                href="#taydenna-pyynto"
                className="mt-2 inline-flex text-xs font-medium text-violet-800 hover:underline"
              >
                Pyydä täydennystä asiakkaalta ↓
              </a>
            </div>
          )}

          {!hasIssues && assistant.completenessScore >= 90 && (
            <p className="text-xs text-emerald-800">
              Tarjous näyttää selkeältä — voit lähettää kun hinta ja viesti ovat
              kunnossa.
            </p>
          )}

          {missingIds.length > 0 && assistant.completenessScore < 90 && (
            <button
              type="button"
              onClick={() => {
                const lines = missingIds.map((id) => {
                  const item = scopeItems.find((i) => i.id === id);
                  return scopeSuggestionForItem(id, item?.label ?? id);
                });
                onAppendScope(lines.join("\n"));
              }}
              className="text-xs font-medium text-indigo-800 hover:underline"
            >
              Lisää kaikki puuttuvat kohdat kerralla →
            </button>
          )}
        </div>
      )}
    </aside>
  );
}
