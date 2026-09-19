"use client";

import { useMemo, useState } from "react";
import { CostBreakdownChart } from "@/components/calculator/cost-breakdown-chart";
import { brand } from "@/lib/brand-theme";
import type { BidCalculatorResult } from "@/lib/bid-calculator-bridge";
import { applyConfiguredQuestions } from "@/lib/calculators/resolve";
import {
  applyContractorRatesToLines,
  applyMargin,
  contractorOverheadLines,
  type ContractorPricingRates,
} from "@/lib/calculators/contractor-pricing";
import {
  applyTierOverrides,
  calculateEstimate,
  clampQuantity,
  formatEuro,
} from "@/lib/calculators/math";
import type { CalculatorConfig, CalculatorLineItem } from "@/lib/calculators/types";

const CHART_COLORS = [
  "bg-stone-400",
  "bg-sky-500",
  "bg-sky-700",
  "bg-orange-400",
  "bg-orange-600",
  "bg-amber-500",
  "bg-violet-500",
  "bg-emerald-500",
];

function defaultAnswers(config: CalculatorConfig): Record<string, string> {
  const answers: Record<string, string> = {};
  for (const q of config.questions ?? []) {
    answers[q.id] = q.defaultOptionId;
  }
  return answers;
}

type Props = {
  config: CalculatorConfig;
  rates: ContractorPricingRates;
  initialPrimaryQty?: number;
  onApply: (result: BidCalculatorResult) => void;
};

export function ContractorBidCalculator({
  config,
  rates,
  initialPrimaryQty,
  onApply,
}: Props) {
  const defaultTier = config.defaultTierId ?? config.tiers?.[0]?.id;
  const [estimateMode, setEstimateMode] = useState<"quick" | "detail">("quick");
  const [answers, setAnswers] = useState<Record<string, string>>(() =>
    defaultAnswers(config),
  );
  const [primaryQty, setPrimaryQty] = useState(
    initialPrimaryQty ?? config.primaryInput.defaultValue,
  );
  const [secondaryQty, setSecondaryQty] = useState(
    config.secondaryInput?.defaultValue ?? 0,
  );
  const [tierId, setTierId] = useState(defaultTier);
  const [suggestedAddons, setSuggestedAddons] = useState<string[]>([]);
  const [suggestedInfoNeeds, setSuggestedInfoNeeds] = useState<string[]>([]);
  const [addonDraft, setAddonDraft] = useState("");
  const [infoNeedDraft, setInfoNeedDraft] = useState("");
  const [suggestForFuture, setSuggestForFuture] = useState(true);
  const [items, setItems] = useState<CalculatorLineItem[]>(() => {
    const tier = config.tiers?.find((t) => t.id === defaultTier);
    const base = tier
      ? applyTierOverrides(structuredClone(config.lineItems), tier.overrides)
      : structuredClone(config.lineItems);
    const withOverhead = [...base, ...contractorOverheadLines(rates)];
    return applyContractorRatesToLines(withOverhead, rates);
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

  const fixedAdd = useMemo(
    () =>
      applyConfiguredQuestions(items, config, answers, estimateMode).fixedAdd,
    [items, config, answers, estimateMode],
  );

  const estimate = useMemo(() => {
    const result = calculateEstimate(clampedPrimary, clampedSecondary, adjustedItems);
    const subtotal = result.total + fixedAdd;
    const totalWithMargin = applyMargin(subtotal, rates.marginPercent);
    return { ...result, subtotal, totalWithMargin };
  }, [clampedPrimary, clampedSecondary, adjustedItems, fixedAdd, rates.marginPercent]);

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

  function applyTier(nextTierId: string) {
    setTierId(nextTierId);
    const tier = config.tiers?.find((t) => t.id === nextTierId);
    if (!tier) return;
    setItems((prev) => {
      const baseOnly = prev.filter(
        (i) => !["telineet", "jate", "matka"].includes(i.id),
      );
      const tiered = applyTierOverrides(baseOnly, tier.overrides);
      const withOverhead = [...tiered, ...contractorOverheadLines(rates)];
      return applyContractorRatesToLines(withOverhead, rates);
    });
  }

  function setAnswer(questionId: string, optionId: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  }

  const visibleQuestions = (config.questions ?? []).filter(
    (q) => q.mode === "quick" || estimateMode === "detail",
  );

  function addAddon() {
    const label = addonDraft.trim();
    if (!label || suggestedAddons.includes(label)) return;
    setSuggestedAddons((prev) => [...prev, label]);
    setAddonDraft("");
  }

  function addInfoNeed() {
    const label = infoNeedDraft.trim();
    if (!label || suggestedInfoNeeds.includes(label)) return;
    setSuggestedInfoNeeds((prev) => [...prev, label]);
    setInfoNeedDraft("");
  }

  function handleApply() {
    onApply({
      subtotal: estimate.subtotal,
      totalWithMargin: estimate.totalWithMargin,
      marginPercent: rates.marginPercent,
      lines: estimate.lines.filter((l) => l.enabled),
      primaryQty: clampedPrimary,
      calculatorSlug: config.slug,
      suggestedAddons,
      suggestedInfoNeeds,
      suggestForFutureRequests: suggestForFuture,
    });
  }

  return (
    <div className="space-y-6 rounded-2xl border-2 border-sky-200 bg-gradient-to-b from-sky-50/80 to-white p-5 sm:p-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-sky-800">
          Urakoitsijan tarjouslaskuri
        </p>
        <p className="mt-1 text-sm text-stone-600">
          Laske tarjous omilla hinnoillasi ja katteellasi. Sama rakenne kuin
          asiakkaan vertailussa — eri tarkoitus, sama moottori.
        </p>
      </div>

      {(config.questions?.length ?? 0) > 0 && (
        <div className="inline-flex rounded-xl border border-stone-200 bg-stone-50 p-1">
          <button
            type="button"
            onClick={() => setEstimateMode("quick")}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
              estimateMode === "quick"
                ? "bg-white text-sky-900 shadow-sm"
                : "text-stone-600"
            }`}
          >
            Nopea
          </button>
          <button
            type="button"
            onClick={() => setEstimateMode("detail")}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
              estimateMode === "detail"
                ? "bg-white text-sky-900 shadow-sm"
                : "text-stone-600"
            }`}
          >
            Tarkempi
          </button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium text-stone-700">
            {config.primaryInput.label} ({config.primaryInput.unit})
          </span>
          <input
            type="number"
            min={config.primaryInput.min}
            max={config.primaryInput.max}
            step={config.primaryInput.step ?? 1}
            value={primaryQty}
            onChange={(e) =>
              setPrimaryQty(Number(e.target.value) || config.primaryInput.min)
            }
            className={`mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 ${brand.input}`}
          />
        </label>
        {config.secondaryInput && (
          <label className="block text-sm">
            <span className="font-medium text-stone-700">
              {config.secondaryInput.label} ({config.secondaryInput.unit})
            </span>
            <input
              type="number"
              min={config.secondaryInput.min}
              max={config.secondaryInput.max}
              value={secondaryQty}
              onChange={(e) =>
                setSecondaryQty(
                  Number(e.target.value) || config.secondaryInput!.min,
                )
              }
              className={`mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 ${brand.input}`}
            />
          </label>
        )}
      </div>

      {config.tiers && config.tiers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {config.tiers.map((tier) => (
            <button
              key={tier.id}
              type="button"
              onClick={() => applyTier(tier.id)}
              className={`rounded-xl border px-3 py-2 text-sm font-medium ${
                tierId === tier.id
                  ? "border-sky-600 bg-sky-50 text-sky-900"
                  : "border-stone-200 bg-white"
              }`}
            >
              {tier.label}
            </button>
          ))}
        </div>
      )}

      {visibleQuestions.map((question) => (
        <fieldset key={question.id}>
          <legend className="text-sm font-medium text-stone-800">
            {question.label}
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {question.options.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setAnswer(question.id, option.id)}
                className={`rounded-xl border px-3 py-2 text-sm ${
                  (answers[question.id] ?? question.defaultOptionId) === option.id
                    ? "border-sky-600 bg-sky-50 text-sky-900"
                    : "border-stone-200 bg-white"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>
      ))}

      <ul className="space-y-2">
        {adjustedItems.map((item) => {
          const lineTotal = calculateEstimate(clampedPrimary, clampedSecondary, [
            item,
          ]).total;
          return (
            <li
              key={item.id}
              className="flex items-center justify-between rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
            >
              <span className="font-medium text-stone-800">{item.label}</span>
              <span className="font-semibold tabular-nums">
                {formatEuro(lineTotal)}
              </span>
            </li>
          );
        })}
        {fixedAdd > 0 && (
          <li className="flex justify-between rounded-xl border border-dashed border-stone-200 px-3 py-2 text-sm">
            <span>Lisäkulut (kysymykset)</span>
            <span className="font-semibold">{formatEuro(fixedAdd)}</span>
          </li>
        )}
      </ul>

      <div className="rounded-xl border border-stone-200 bg-white p-4">
        <p className="text-sm font-semibold text-stone-800">
          Puuttuuko laskurista jokin?
        </p>
        <p className="mt-1 text-xs text-stone-600">
          Yksittäinen ehdotus ei muuta laskuria kaikille. Kun useat urakoitsijat
          pyytävät samaa, se ehdotetaan tuleville tarjouspyynnöille.
        </p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-stone-700">
              Lisätyö tai rivi (esim. pellitettävä savupiippu)
            </label>
            <div className="mt-1 flex gap-2">
              <input
                type="text"
                value={addonDraft}
                onChange={(e) => setAddonDraft(e.target.value)}
                className={`flex-1 rounded-lg border border-stone-200 px-3 py-2 text-sm ${brand.input}`}
                placeholder="Sadevesijärjestelmä"
              />
              <button
                type="button"
                onClick={addAddon}
                className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium"
              >
                +
              </button>
            </div>
            {suggestedAddons.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs text-stone-600">
                {suggestedAddons.map((a) => (
                  <li key={a}>• {a}</li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-700">
              Puuttuva tieto (esim. katon kaltevuus)
            </label>
            <div className="mt-1 flex gap-2">
              <input
                type="text"
                value={infoNeedDraft}
                onChange={(e) => setInfoNeedDraft(e.target.value)}
                className={`flex-1 rounded-lg border border-stone-200 px-3 py-2 text-sm ${brand.input}`}
                placeholder="Katon kaltevuus"
              />
              <button
                type="button"
                onClick={addInfoNeed}
                className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium"
              >
                +
              </button>
            </div>
            {suggestedInfoNeeds.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs text-stone-600">
                {suggestedInfoNeeds.map((a) => (
                  <li key={a}>• {a}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <label className="mt-3 flex items-start gap-2 text-xs text-stone-600">
          <input
            type="checkbox"
            checked={suggestForFuture}
            onChange={(e) => setSuggestForFuture(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            Ehdota näitä tuleville tarjouspyynnöille, kun useat urakoitsijat
            pyytävät samaa
          </span>
        </label>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <CostBreakdownChart
          segments={chartSegments}
          title="Kustannusjako (ennen katetta)"
          subtitle={`Kate ${rates.marginPercent} % · työtunti ${rates.hourlyRate} €/h`}
        />
        <div className={`${brand.estimateBox} p-5`}>
          <p className="text-sm font-medium text-sky-800">Tarjouksen loppusumma</p>
          <p className="mt-1 text-3xl font-bold text-sky-950">
            {formatEuro(estimate.totalWithMargin)}
          </p>
          <p className="mt-2 text-sm text-sky-900/90">
            Ennen katetta {formatEuro(estimate.subtotal)} · Kate{" "}
            {rates.marginPercent} % (
            {formatEuro(estimate.totalWithMargin - estimate.subtotal)})
          </p>
          <button
            type="button"
            onClick={handleApply}
            className={`${brand.btnPrimary} mt-4 w-full`}
          >
            Jätä tämä tarjous tarjouspyyntöön
          </button>
        </div>
      </div>

      <p className="text-xs text-stone-500">
        Hinnat: työtunti {rates.hourlyRate} €/h · kate {rates.marginPercent} % ·
        muokkaa Oma tili → Laskentaparametrit. Laskettu data auttaa oppivaa
        järjestelmää parantamaan arvioita.
      </p>
    </div>
  );
}
