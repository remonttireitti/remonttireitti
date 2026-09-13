"use client";

import { useMemo, useState } from "react";
import { scopeCheckItemsForJob } from "@/lib/bid-comparison-insights";
import {
  analyzeBidAssistant,
  assistantActionLabel,
  assistantTargetForItem,
  assistantTimelineHint,
} from "@/lib/bid-assistant";
import type { BidScopeLine } from "@/lib/bid-scope-lines";
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
  scopeLines,
  jobTypeSlug,
  projectQuality,
  onFocusItem,
  scopeLineStatus,
}: {
  fields: BidFormFields;
  scopeLines?: BidScopeLine[];
  jobTypeSlug?: string | null;
  projectQuality?: ProjectQualityResult | null;
  onFocusItem: (itemId: string, label: string) => void;
  scopeLineStatus?: (
    itemId: string,
    label: string,
  ) => "missing" | "pending" | "done";
}) {
  const [expanded, setExpanded] = useState(true);

  const assistant = useMemo(
    () =>
      analyzeBidAssistant(
        fields,
        jobTypeSlug ?? null,
        projectQuality,
        scopeLines,
      ),
    [fields, jobTypeSlug, projectQuality, scopeLines],
  );

  const scopeItems = scopeCheckItemsForJob(jobTypeSlug ?? null);
  const hasIssues =
    assistant.insight.missingItems.length > 0 ||
    assistant.insight.partialItems.length > 0 ||
    assistant.projectGaps.length > 0;

  function renderItemAction(itemId: string, label: string) {
    const target = assistantTargetForItem(itemId);

    if (target === null) {
      return (
        <p className="mt-2 text-xs text-stone-600">{assistantTimelineHint()}</p>
      );
    }

    const status = scopeLineStatus?.(itemId, label);
    if (status === "done") {
      return (
        <p className="mt-2 text-xs font-medium text-emerald-700">✓ Kunnossa</p>
      );
    }
    if (status === "pending") {
      return (
        <button
          type="button"
          onClick={() => onFocusItem(itemId, label)}
          className="mt-2 text-xs font-medium text-sky-800 hover:underline"
        >
          Täydennä kenttää ↑
        </button>
      );
    }

    if (target !== "scope_terms") {
      const filled =
        (target === "warranty_work" && fields.warranty_work.trim().length >= 4) ||
        (target === "contract_terms" && fields.contract_terms.trim().length >= 4);
      if (filled) {
        return (
          <p className="mt-2 text-xs font-medium text-emerald-700">✓ Kunnossa</p>
        );
      }
    }

    const actionLabel = assistantActionLabel(target);
    return (
      <button
        type="button"
        onClick={() => onFocusItem(itemId, label)}
        className="mt-2 text-xs font-medium text-indigo-800 hover:underline"
      >
        {actionLabel}
      </button>
    );
  }

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
            Kentät ovat valmiina — täytä ne yksi kerrallaan. Eteneminen päivittyy
            automaattisesti, kuten tarjouspyynnössä.
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
                    ✓ {s}
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
                        Kenttä on tyhjä — täytä se yllä olevasta listasta.
                      </p>
                      {renderItemAction(itemId, label)}
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
                        Aloitettu — tarkenna vielä lyhyesti.
                      </p>
                      {renderItemAction(itemId, label)}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {!hasIssues && assistant.completenessScore >= 90 && (
            <p className="text-xs text-emerald-800">
              Tarjous näyttää selkeältä — voit lähettää kun hinta ja ehdot ovat
              kunnossa.
            </p>
          )}
        </div>
      )}
    </aside>
  );
}
