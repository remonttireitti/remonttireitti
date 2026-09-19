"use client";

import { useMemo } from "react";
import { CalculatorInputsSection } from "@/components/calculator/calculator-form-controls";
import type { CalculatorInputState } from "@/lib/calculator-input-state";
import {
  applyTierOverrides,
  calculateEstimate,
  clampQuantity,
  formatEuro,
} from "@/lib/calculators/math";
import {
  applyConfiguredQuestions,
  resolveEstimateRange,
} from "@/lib/calculators/resolve";
import type { CalculatorConfig } from "@/lib/calculators/types";
import { VatLabel } from "@/components/price/price-with-vat";
import { CONSUMER_VAT } from "@/lib/vat-label";
import { brand } from "@/lib/brand-theme";

type Props = {
  config: CalculatorConfig;
  inputs: CalculatorInputState;
  onChange: (inputs: CalculatorInputState) => void;
};

export function ProjectCalculatorInputsSection({ config, inputs, onChange }: Props) {
  const clampedPrimary = clampQuantity(
    inputs.primaryQty,
    config.primaryInput.min,
    config.primaryInput.max,
  );
  const clampedSecondary = config.secondaryInput
    ? clampQuantity(
        inputs.secondaryQty,
        config.secondaryInput.min,
        config.secondaryInput.max,
      )
    : 0;

  const tier = config.tiers?.find((t) => t.id === inputs.tierId);
  const baseItems = useMemo(() => {
    const cloned = structuredClone(config.lineItems);
    return tier ? applyTierOverrides(cloned, tier.overrides) : cloned;
  }, [config.lineItems, tier]);

  const { items: adjustedItems, fixedAdd } = useMemo(
    () =>
      applyConfiguredQuestions(
        baseItems,
        config,
        inputs.answers,
        inputs.estimateMode,
      ),
    [baseItems, config, inputs.answers, inputs.estimateMode],
  );

  const estimate = useMemo(() => {
    const result = calculateEstimate(clampedPrimary, clampedSecondary, adjustedItems);
    return { ...result, total: result.total + fixedAdd };
  }, [clampedPrimary, clampedSecondary, adjustedItems, fixedAdd]);

  const range = useMemo(
    () => resolveEstimateRange(config, estimate.total, clampedPrimary),
    [config, estimate.total, clampedPrimary],
  );

  return (
    <div className="space-y-4">
      <CalculatorInputsSection
        config={config}
        inputs={inputs}
        onChange={(patch) => onChange({ ...inputs, ...patch })}
        title="Kohteen tiedot"
        description="Sama rakenne kuin hintalaskurissa — muutokset päivittävät tarjouspyynnön automaattisesti."
      />
      <aside className={`${brand.estimateBox} px-4 py-4 sm:px-5`}>
        <p className="text-sm font-medium uppercase tracking-wide text-sky-800">
          Laskurin arvio (viite)
        </p>
        <p className="mt-1 text-2xl font-bold text-sky-950">
          {formatEuro(range.low)} – {formatEuro(range.high)}
        </p>
        <p className="mt-1">
          <VatLabel treatment={CONSUMER_VAT} className="text-sm text-sky-900/80" />
        </p>
        <p className="mt-2 text-sm text-sky-900/90">
          Todennäköinen taso: <strong>noin {formatEuro(estimate.total)}</strong>
        </p>
        <p className="mt-1 text-xs text-sky-900/75">
          Urakoitsijat tarjoavat omat hintansa — tämä on vain suuntaa-antava arvio.
        </p>
      </aside>
    </div>
  );
}

/** Laske arvio tarjouspyynnön piilotettua snapshot-kenttää varten. */
export function estimateFromCalculatorInputs(
  config: CalculatorConfig,
  inputs: CalculatorInputState,
): { total: number; low: number; high: number; primaryQty: number; secondaryQty: number } {
  const clampedPrimary = clampQuantity(
    inputs.primaryQty,
    config.primaryInput.min,
    config.primaryInput.max,
  );
  const clampedSecondary = config.secondaryInput
    ? clampQuantity(
        inputs.secondaryQty,
        config.secondaryInput.min,
        config.secondaryInput.max,
      )
    : 0;
  const tier = config.tiers?.find((t) => t.id === inputs.tierId);
  const baseItems = structuredClone(config.lineItems);
  const items = tier ? applyTierOverrides(baseItems, tier.overrides) : baseItems;
  const { items: adjustedItems, fixedAdd } = applyConfiguredQuestions(
    items,
    config,
    inputs.answers,
    inputs.estimateMode,
  );
  const result = calculateEstimate(clampedPrimary, clampedSecondary, adjustedItems);
  const total = result.total + fixedAdd;
  const range = resolveEstimateRange(config, total, clampedPrimary);
  return {
    total,
    low: range.low,
    high: range.high,
    primaryQty: clampedPrimary,
    secondaryQty: clampedSecondary,
  };
}
