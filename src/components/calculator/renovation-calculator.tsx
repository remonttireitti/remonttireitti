"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalculatorEstimateSummary } from "@/components/calculator/calculator-estimate-summary";
import { CostBreakdownChart } from "@/components/calculator/cost-breakdown-chart";
import { brand } from "@/lib/brand-theme";
import {
  applyTierOverrides,
  calculateEstimate,
  clampQuantity,
  formatEuro,
  googlePriceSearch,
  newCustomLineItem,
} from "@/lib/calculators/math";
import {
  applyConfiguredQuestions,
  formatLivePriceNote,
  resolveEstimateRange,
} from "@/lib/calculators/resolve";
import type { CalculatorConfig, CalculatorLineItem } from "@/lib/calculators/types";
import { MAINTENANCE_JOB_SLUGS } from "@/constants/maintenance";

const CHART_COLORS = [
  "bg-stone-400",
  "bg-sky-500",
  "bg-sky-700",
  "bg-orange-400",
  "bg-orange-600",
  "bg-amber-500",
  "bg-violet-500",
  "bg-emerald-500",
  "bg-rose-400",
  "bg-teal-500",
];

function ctaHref(jobSlug: string): string {
  if ((MAINTENANCE_JOB_SLUGS as readonly string[]).includes(jobSlug)) {
    return `/huolto/uusi?tyyppi=${jobSlug}`;
  }
  return `/remontti/uusi?tyyppi=${jobSlug}`;
}

function unitLabel(unit: CalculatorLineItem["unit"], primaryUnit: string, secondaryUnit?: string): string {
  if (unit === "fixed") return "Kiinteä €";
  if (unit === "per_secondary") return `€ / ${secondaryUnit ?? "yks."}`;
  return `€ / ${primaryUnit}`;
}

function defaultAnswers(config: CalculatorConfig): Record<string, string> {
  const answers: Record<string, string> = {};
  for (const q of config.questions ?? []) {
    answers[q.id] = q.defaultOptionId;
  }
  return answers;
}

export function RenovationCalculator({ config }: { config: CalculatorConfig }) {
  const defaultTier = config.defaultTierId ?? config.tiers?.[0]?.id;
  const hasQuestions = (config.questions?.length ?? 0) > 0;
  const [estimateMode, setEstimateMode] = useState<"quick" | "detail">("quick");
  const [answers, setAnswers] = useState<Record<string, string>>(() => defaultAnswers(config));
  const [primaryQty, setPrimaryQty] = useState(config.primaryInput.defaultValue);
  const [secondaryQty, setSecondaryQty] = useState(
    config.secondaryInput?.defaultValue ?? 0,
  );
  const [tierId, setTierId] = useState(defaultTier);
  const [items, setItems] = useState<CalculatorLineItem[]>(() => {
    const tier = config.tiers?.find((t) => t.id === defaultTier);
    return tier
      ? applyTierOverrides(structuredClone(config.lineItems), tier.overrides)
      : structuredClone(config.lineItems);
  });

  const clampedPrimary = clampQuantity(
    primaryQty,
    config.primaryInput.min,
    config.primaryInput.max,
  );
  const clampedSecondary = config.secondaryInput
    ? clampQuantity(
        secondaryQty,
        config.secondaryInput.min,
        config.secondaryInput.max,
      )
    : 0;

  const adjustedItems = useMemo(() => {
    const { items: questionItems } = applyConfiguredQuestions(
      items,
      config,
      answers,
      estimateMode,
    );
    return questionItems;
  }, [items, config, answers, estimateMode]);

  const fixedAdd = useMemo(() => {
    return applyConfiguredQuestions(items, config, answers, estimateMode).fixedAdd;
  }, [items, config, answers, estimateMode]);

  const estimate = useMemo(() => {
    const result = calculateEstimate(clampedPrimary, clampedSecondary, adjustedItems);
    return { ...result, total: result.total + fixedAdd };
  }, [clampedPrimary, clampedSecondary, adjustedItems, fixedAdd]);

  const range = useMemo(
    () => resolveEstimateRange(config, estimate.total, clampedPrimary),
    [config, estimate.total, clampedPrimary],
  );

  const chartSegments = useMemo(
    () =>
      estimate.lines
        .filter((l) => l.enabled && l.amount > 0)
        .map((l, i) => ({
          label: l.label,
          amount: l.amount,
          color: CHART_COLORS[i % CHART_COLORS.length]!,
        })),
    [estimate.lines],
  );

  const unansweredDetailQuestionIds = useMemo(() => {
    if (estimateMode === "detail") return [];
    return (config.questions ?? [])
      .filter((q) => q.mode === "detail")
      .map((q) => q.id);
  }, [config.questions, estimateMode]);

  const visibleQuestions = useMemo(
    () =>
      (config.questions ?? []).filter(
        (q) => q.mode === "quick" || estimateMode === "detail",
      ),
    [config.questions, estimateMode],
  );

  function updateItem(id: string, patch: Partial<CalculatorLineItem>) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  function applyTier(nextTierId: string) {
    setTierId(nextTierId);
    const tier = config.tiers?.find((t) => t.id === nextTierId);
    if (!tier) return;
    setItems((prev) => applyTierOverrides(prev, tier.overrides));
  }

  function setAnswer(questionId: string, optionId: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  }

  const primaryLabel = `${clampedPrimary} ${config.primaryInput.unit}`;
  const subtitleParts = [primaryLabel];
  if (config.secondaryInput) {
    subtitleParts.push(`${clampedSecondary} ${config.secondaryInput.unit}`);
  }

  const livePriceNote = formatLivePriceNote(
    config,
    clampedPrimary,
    estimate.total,
    range.low,
    range.high,
  );

  return (
    <div className="space-y-8">
      <section className={`${brand.section} p-5 sm:p-6`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-bold text-stone-900">Laske arvio</h2>
          {hasQuestions && (
            <div className="inline-flex rounded-xl border border-stone-200 bg-stone-50 p-1">
              <button
                type="button"
                onClick={() => setEstimateMode("quick")}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                  estimateMode === "quick"
                    ? "bg-white text-sky-900 shadow-sm"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                Nopea arvio
              </button>
              <button
                type="button"
                onClick={() => setEstimateMode("detail")}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                  estimateMode === "detail"
                    ? "bg-white text-sky-900 shadow-sm"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                Tarkempi arvio
              </button>
            </div>
          )}
        </div>

        {config.primaryInput.hint && (
          <p className="mt-2 text-sm text-stone-600">{config.primaryInput.hint}</p>
        )}

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-stone-700">
              {config.primaryInput.label} ({config.primaryInput.unit})
            </span>
            <input
              type="number"
              min={config.primaryInput.min}
              max={config.primaryInput.max}
              step={config.primaryInput.step ?? 1}
              value={primaryQty}
              onChange={(e) => setPrimaryQty(Number(e.target.value) || config.primaryInput.min)}
              className={`mt-1 w-full rounded-xl border border-stone-200 px-3 py-2.5 text-lg font-semibold ${brand.input}`}
            />
          </label>

          {config.secondaryInput && (
            <label className="block">
              <span className="text-sm font-medium text-stone-700">
                {config.secondaryInput.label} ({config.secondaryInput.unit})
              </span>
              <input
                type="number"
                min={config.secondaryInput.min}
                max={config.secondaryInput.max}
                step={config.secondaryInput.step ?? 1}
                value={secondaryQty}
                onChange={(e) =>
                  setSecondaryQty(
                    Number(e.target.value) || config.secondaryInput!.min,
                  )
                }
                className={`mt-1 w-full rounded-xl border border-stone-200 px-3 py-2.5 text-lg font-semibold ${brand.input}`}
              />
              {config.secondaryInput.hint && (
                <span className="mt-1 block text-xs text-stone-500">
                  {config.secondaryInput.hint}
                </span>
              )}
            </label>
          )}
        </div>

        {config.tiers && config.tiers.length > 0 && (
          <fieldset className="mt-4">
            <legend className="text-sm font-medium text-stone-700">Laite- / materiaalitaso</legend>
            <div className="mt-1 flex flex-wrap gap-2">
              {config.tiers.map((tier) => (
                <button
                  key={tier.id}
                  type="button"
                  onClick={() => applyTier(tier.id)}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                    tierId === tier.id
                      ? "border-sky-600 bg-sky-50 text-sky-900"
                      : "border-stone-200 bg-white text-stone-700 hover:border-sky-200"
                  }`}
                >
                  {tier.label}
                  {tier.subtitle && (
                    <span className="mt-0.5 block text-xs font-normal text-stone-500">
                      {tier.subtitle}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        {visibleQuestions.length > 0 && (
          <div className="mt-6 space-y-4 border-t border-stone-100 pt-5">
            <p className="text-sm text-stone-600">
              {estimateMode === "quick"
                ? "Vastaa muutamaan kysymykseen — saat tarkemman suuntaa-antavan arvion."
                : "Lisäkysymykset tarkentavat arviota erityisesti kohteen rakenteen ja työn vaikeuden osalta."}
            </p>
            {visibleQuestions.map((question) => (
              <fieldset key={question.id}>
                <legend className="text-sm font-medium text-stone-800">{question.label}</legend>
                {question.hint && (
                  <p className="mt-0.5 text-xs text-stone-500">{question.hint}</p>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  {question.options.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setAnswer(question.id, option.id)}
                      className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                        (answers[question.id] ?? question.defaultOptionId) === option.id
                          ? "border-sky-600 bg-sky-50 text-sky-900"
                          : "border-stone-200 bg-white text-stone-700 hover:border-sky-200"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-bold text-stone-900">Kustannusrivit</h2>
          <button
            type="button"
            onClick={() => setItems((prev) => [...prev, newCustomLineItem()])}
            className={`${brand.btnSecondary} text-sm`}
          >
            + Lisää oma kulu
          </button>
        </div>
        <p className="text-sm text-stone-600">
          Muokkaa hintoja tarpeen mukaan. Voit tarkistaa markkinahintoja{" "}
          <span className="font-medium">Google-haun</span> kautta jokaisen rivin
          kohdalta.
        </p>

        <ul className="space-y-3">
          {items.map((item) => {
            const adjusted = adjustedItems.find((i) => i.id === item.id) ?? item;
            const lineTotal = calculateEstimate(clampedPrimary, clampedSecondary, [adjusted]).total;
            return (
              <li
                key={item.id}
                className={`rounded-2xl border p-4 transition ${
                  adjusted.enabled
                    ? "border-stone-200 bg-white"
                    : "border-stone-100 bg-stone-50 opacity-60"
                }`}
              >
                <div className="flex flex-wrap items-start gap-3">
                  <input
                    type="checkbox"
                    checked={adjusted.enabled}
                    onChange={(e) =>
                      updateItem(item.id, { enabled: e.target.checked })
                    }
                    className={`mt-1 ${brand.checkbox}`}
                    aria-label={`Sisällytä ${item.label}`}
                  />
                  <div className="min-w-0 flex-1">
                    {item.custom ? (
                      <input
                        type="text"
                        value={item.label}
                        onChange={(e) =>
                          updateItem(item.id, { label: e.target.value })
                        }
                        className={`mb-2 w-full rounded-lg border border-stone-200 px-2 py-1 text-sm font-semibold ${brand.input}`}
                      />
                    ) : (
                      <p className="font-semibold text-stone-900">{item.label}</p>
                    )}
                    {item.description && (
                      <p className="mt-0.5 text-xs text-stone-500">
                        {item.description}
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap items-end gap-3">
                      <label className="text-xs text-stone-600">
                        {unitLabel(
                          item.unit,
                          config.primaryInput.unit,
                          config.secondaryInput?.unit,
                        )}
                        <input
                          type="number"
                          min={0}
                          step={
                            item.unit === "fixed"
                              ? 50
                              : item.unit === "per_secondary"
                                ? 5
                                : 10
                          }
                          value={item.amount}
                          onChange={(e) =>
                            updateItem(item.id, {
                              amount: Number(e.target.value) || 0,
                            })
                          }
                          className={`mt-0.5 block w-28 rounded-lg border border-stone-200 px-2 py-1.5 text-sm ${brand.input}`}
                        />
                      </label>
                      {item.minAmount != null && (
                        <label className="text-xs text-stone-600">
                          Minimi €
                          <input
                            type="number"
                            min={0}
                            step={100}
                            value={item.minAmount}
                            onChange={(e) =>
                              updateItem(item.id, {
                                minAmount: Number(e.target.value) || 0,
                              })
                            }
                            className={`mt-0.5 block w-28 rounded-lg border border-stone-200 px-2 py-1.5 text-sm ${brand.input}`}
                          />
                        </label>
                      )}
                      {item.custom && (
                        <label className="text-xs text-stone-600">
                          Tyyppi
                          <select
                            value={item.unit}
                            onChange={(e) =>
                              updateItem(item.id, {
                                unit: e.target.value as CalculatorLineItem["unit"],
                              })
                            }
                            className={`mt-0.5 block rounded-lg border border-stone-200 px-2 py-1.5 text-sm ${brand.input}`}
                          >
                            <option value="fixed">Kiinteä summa</option>
                            <option value="per_primary">
                              € / {config.primaryInput.unit}
                            </option>
                            {config.secondaryInput && (
                              <option value="per_secondary">
                                € / {config.secondaryInput.unit}
                              </option>
                            )}
                          </select>
                        </label>
                      )}
                      {item.searchHint && (
                        <a
                          href={googlePriceSearch(item.searchHint)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium text-sky-700 hover:underline"
                        >
                          Hae hintoja Googlesta ↗
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-stone-900">
                      {formatEuro(lineTotal)}
                    </p>
                    {item.custom && (
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="mt-1 text-xs text-red-600 hover:underline"
                      >
                        Poista
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        {fixedAdd > 0 && (
          <p className="text-sm text-stone-600">
            Lisäkulut (läpiviennit, piiput, eristeet ym.):{" "}
            <strong>{formatEuro(fixedAdd)}</strong>
          </p>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <CostBreakdownChart
          segments={chartSegments}
          title="Arviosi kustannusjako"
          subtitle={`${subtitleParts.join(" · ")} · arvio yhteensä ${formatEuro(estimate.total)}`}
        />

        <div className={`${brand.estimateBox} flex flex-col justify-center p-6`}>
          <p className="text-sm font-medium uppercase tracking-wide text-sky-800">
            Arvioitu kustannus
          </p>
          <p className="mt-2 text-3xl font-bold text-sky-950">
            {formatEuro(range.low)} – {formatEuro(range.high)}
          </p>
          <p className="mt-2 text-sm text-sky-900/90">
            Todennäköinen taso: <strong>noin {formatEuro(estimate.total)}</strong>
          </p>
          <p className="mt-2 text-xs text-sky-900/80">{livePriceNote}</p>
          <Link
            href={ctaHref(config.jobSlug)}
            className={`${brand.btnPrimary} mt-4 text-center text-sm`}
          >
            {config.ctaLabel ?? "Pyydä tarjoukset"}
          </Link>
        </div>
      </div>

      <CalculatorEstimateSummary
        config={config}
        total={estimate.total}
        low={range.low}
        high={range.high}
        perUnitMid={range.perUnitMid}
        primaryQty={clampedPrimary}
        detailMode={estimateMode === "detail"}
        unansweredDetailQuestionIds={unansweredDetailQuestionIds}
      />
    </div>
  );
}
