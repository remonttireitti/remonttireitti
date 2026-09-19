"use client";

import { useState } from "react";
import { BidForm } from "@/components/bid/bid-form";
import { ContractorBidCalculator } from "@/components/calculator/contractor-bid-calculator";
import type { BidCalculatorResult } from "@/lib/bid-calculator-bridge";
import {
  calculatorMetaNote,
  scopeLinesFromCalculatorResult,
} from "@/lib/bid-calculator-bridge";
import { buildSeededScopeLines } from "@/lib/bid-scope-lines";
import type { ContractorPricingRates } from "@/lib/calculators/contractor-pricing";
import type { CalculatorConfig } from "@/lib/calculators/types";
import type { ContractorBidDefaults } from "@/lib/contractor-bid-defaults-shared";
import type { ProjectBudgetInfo } from "@/lib/project-budget";
import type { ProjectTradeContext } from "@/lib/project-trades-server";
import type { ServiceEngagement } from "@/lib/service-engagement";

type BidFormProps = React.ComponentProps<typeof BidForm>;

type CalculatorPrefill = {
  amountEuros: string;
  scopeLines: ReturnType<typeof scopeLinesFromCalculatorResult>;
  messageNote: string;
};

export function ContractorBidWorkspace({
  calculatorConfig,
  pricingRates,
  initialPrimaryQty,
  jobTypeSlug,
  ...bidFormProps
}: {
  calculatorConfig: CalculatorConfig;
  pricingRates: ContractorPricingRates;
  initialPrimaryQty?: number;
  jobTypeSlug?: string | null;
  projectId: string;
  requiresDeviceAndInstallation: boolean;
  allowOptionalEquipmentOffer: boolean;
  mode?: "create" | "edit";
  bidId?: string;
  initialFields?: BidFormProps["initialFields"];
  budgetInfo: ProjectBudgetInfo;
  defaultBidTerms?: ContractorBidDefaults;
  tradeContext?: ProjectTradeContext;
  serviceEngagement?: ServiceEngagement | null;
}) {
  const [prefill, setPrefill] = useState<CalculatorPrefill | null>(null);
  const [prefillVersion, setPrefillVersion] = useState(0);
  const [applied, setApplied] = useState(false);

  function handleCalculatorApply(result: BidCalculatorResult) {
    const seeded = buildSeededScopeLines(
      jobTypeSlug ?? null,
      bidFormProps.initialFields?.scope_terms ?? "",
    );
    const scopeLines = scopeLinesFromCalculatorResult(result, seeded);
    const note = calculatorMetaNote(calculatorConfig);

    setPrefill({
      amountEuros: String(Math.round(result.totalWithMargin)),
      scopeLines,
      messageNote: note,
    });
    setPrefillVersion((v) => v + 1);
    setApplied(true);

    requestAnimationFrame(() => {
      document
        .getElementById("bid-form-after-calculator")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  return (
    <div className="space-y-8">
      <ContractorBidCalculator
        config={calculatorConfig}
        rates={pricingRates}
        initialPrimaryQty={initialPrimaryQty}
        onApply={handleCalculatorApply}
      />

      {applied && (
        <p
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
          role="status"
        >
          Laskurin summa ja rivit on siirretty tarjouslomakkeelle. Tarkista
          ehdot ja lähetä tarjous.
        </p>
      )}

      <div id="bid-form-after-calculator" className="scroll-mt-24">
        <h2 className="text-lg font-semibold">Tarjouslomake</h2>
        <p className="mt-1 text-sm text-stone-600">
          {applied
            ? "Muokkaa tarvittaessa hintaa ja ehtoja ennen lähettämistä."
            : "Voit täyttää lomakkeen käsin tai käyttää laskuria yllä."}
        </p>
        <div className="mt-4">
          <BidForm
            {...bidFormProps}
            jobTypeSlug={jobTypeSlug}
            calculatorPrefill={prefill}
            calculatorPrefillVersion={prefillVersion}
          />
        </div>
      </div>
    </div>
  );
}
