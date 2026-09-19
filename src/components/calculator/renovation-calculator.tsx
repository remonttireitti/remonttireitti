"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalculatorEstimateSummary } from "@/components/calculator/calculator-estimate-summary";
import {
  CalculatorLineItemsEditor,
  newCustomLineItem,
} from "@/components/calculator/calculator-line-items-editor";
import { CostBreakdownChart } from "@/components/calculator/cost-breakdown-chart";
import { CalculatorInputsSection } from "@/components/calculator/calculator-form-controls";
import { brand } from "@/lib/brand-theme";
import {
  defaultCalculatorAnswers,
  type CalculatorInputState,
} from "@/lib/calculator-input-state";
import { saveCalculatorProjectSnapshot } from "@/lib/calculator-project-snapshot";
import {
  applyTierOverrides,
  calculateEstimate,
  clampQuantity,
  formatEuro,
} from "@/lib/calculators/math";
import {
  applyConfiguredQuestions,
  formatLivePriceNote,
  resolveEstimateRange,
} from "@/lib/calculators/resolve";
import type { CalculatorConfig, CalculatorLineItem } from "@/lib/calculators/types";
import { VatLabel } from "@/components/price/price-with-vat";
import { CONSUMER_VAT } from "@/lib/vat-label";
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

export function RenovationCalculator({ config }: { config: CalculatorConfig }) {
  const defaultTier = config.defaultTierId ?? config.tiers?.[0]?.id;
  const [calcInputs, setCalcInputs] = useState<CalculatorInputState>(() => ({
    primaryQty: config.primaryInput.defaultValue,
    secondaryQty: config.secondaryInput?.defaultValue ?? 0,
    tierId: defaultTier,
    answers: defaultCalculatorAnswers(config),
    estimateMode: "quick",
  }));
  const { primaryQty, secondaryQty, tierId, answers, estimateMode } = calcInputs;
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

  function updateItem(id: string, patch: Partial<CalculatorLineItem>) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  function patchCalcInputs(patch: Partial<CalculatorInputState>) {
    setCalcInputs((prev) => {
      const next = { ...prev, ...patch };
      if (patch.tierId) {
        const tier = config.tiers?.find((t) => t.id === patch.tierId);
        if (tier) {
          setItems((itemsPrev) => applyTierOverrides(itemsPrev, tier.overrides));
        }
      }
      return next;
    });
  }

  function persistSnapshot() {
    saveCalculatorProjectSnapshot({
      calculatorSlug: config.slug,
      jobSlug: config.jobSlug,
      calculatorTitle: config.title,
      primaryQty: clampedPrimary,
      primaryUnit: config.primaryInput.unit,
      secondaryQty: clampedSecondary,
      tierId,
      answers,
      estimateMode,
      totalEuros: estimate.total,
      lowEuros: range.low,
      highEuros: range.high,
    });
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
      <CalculatorInputsSection
        config={config}
        inputs={calcInputs}
        onChange={patchCalcInputs}
        title="Laske arvio"
      />

      <CalculatorLineItemsEditor
        config={config}
        items={items}
        adjustedItems={adjustedItems}
        primaryQty={clampedPrimary}
        secondaryQty={clampedSecondary}
        onUpdateItem={updateItem}
        onRemoveItem={removeItem}
        onAddCustomItem={() =>
          setItems((prev) => [...prev, newCustomLineItem()])
        }
        vatTreatment={CONSUMER_VAT}
        fixedAdd={fixedAdd}
        description="Muokkaa hintoja tarpeen mukaan. Voit tarkistaa markkinahintoja Google-haun kautta jokaisen rivin kohdalta."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <CostBreakdownChart
          segments={chartSegments}
          title="Arviosi kustannusjako"
          subtitle={`${subtitleParts.join(" · ")} · arvio yhteensä ${formatEuro(estimate.total)}`}
          vatTreatment={CONSUMER_VAT}
        />

        <div className={`${brand.estimateBox} flex flex-col justify-center p-6`}>
          <p className="text-sm font-medium uppercase tracking-wide text-sky-800">
            Arvioitu kustannus
          </p>
          <p className="mt-2 text-3xl font-bold text-sky-950">
            {formatEuro(range.low)} – {formatEuro(range.high)}
          </p>
          <p className="mt-1">
            <VatLabel treatment={CONSUMER_VAT} className="text-sm text-sky-900/80" />
          </p>
          <p className="mt-2 text-sm text-sky-900/90">
            Todennäköinen taso: <strong>noin {formatEuro(estimate.total)}</strong>
          </p>
          <p className="mt-2 text-xs text-sky-900/80">{livePriceNote}</p>
          <Link
            href={ctaHref(config.jobSlug)}
            onClick={persistSnapshot}
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
        secondaryQty={clampedSecondary}
        tierId={tierId}
        answers={answers}
        estimateMode={estimateMode}
        detailMode={estimateMode === "detail"}
        unansweredDetailQuestionIds={unansweredDetailQuestionIds}
      />
    </div>
  );
}
