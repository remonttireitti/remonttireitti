"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalculatorLineItemsEditor,
  newCustomLineItem,
} from "@/components/calculator/calculator-line-items-editor";
import { CostBreakdownChart } from "@/components/calculator/cost-breakdown-chart";
import { brand } from "@/lib/brand-theme";
import type {
  BidCalculatorResult,
  CustomerCalculatorEstimate,
  ProjectCalculatorInputHints,
} from "@/lib/bid-calculator-bridge";
import {
  buildInitialContractorLineItems,
  calculatorInputsFromProjectHints,
} from "@/lib/bid-calculator-bridge";
import { applyConfiguredQuestions } from "@/lib/calculators/resolve";
import {
  attachReferenceAmounts,
  applyMargin,
  type ContractorPricingRates,
} from "@/lib/calculators/contractor-pricing";
import {
  calculateEstimate,
  clampQuantity,
  formatEuro,
} from "@/lib/calculators/math";
import { BidProfitabilityPanel } from "@/components/calculator/bid-profitability-panel";
import { VatLabel } from "@/components/price/price-with-vat";
import {
  computeProfitability,
  costBreakdownToFields,
  fieldsToCostBreakdown,
  suggestCostBreakdownFromLines,
  type BidCostBreakdown,
} from "@/lib/bid-profitability";
import { CONTRACTOR_COST_VAT } from "@/lib/vat-label";
import type { JobPriceBenchmark } from "@/lib/fair-price-tier";
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

type Props = {
  config: CalculatorConfig;
  rates: ContractorPricingRates;
  initialPrimaryQty?: number;
  projectCalculatorHints?: ProjectCalculatorInputHints;
  customerEstimate?: CustomerCalculatorEstimate | null;
  jobPriceBenchmark?: JobPriceBenchmark | null;
  onApply: (result: BidCalculatorResult) => void;
  /** bid = tarjouspyyntöön, standalone = oma asiakas */
  variant?: "bid" | "standalone";
};

export function ContractorBidCalculator({
  config,
  rates,
  initialPrimaryQty,
  projectCalculatorHints,
  customerEstimate,
  jobPriceBenchmark = null,
  onApply,
  variant = "bid",
}: Props) {
  const isStandalone = variant === "standalone";
  const initialInputs = calculatorInputsFromProjectHints(config, {
    ...projectCalculatorHints,
    primaryQty: projectCalculatorHints?.primaryQty ?? initialPrimaryQty,
  });
  const [estimateMode, setEstimateMode] = useState<"quick" | "detail">(
    initialInputs.estimateMode,
  );
  const [answers, setAnswers] = useState<Record<string, string>>(
    () => initialInputs.answers,
  );
  const [primaryQty, setPrimaryQty] = useState(initialInputs.primaryQty);
  const [secondaryQty, setSecondaryQty] = useState(initialInputs.secondaryQty);
  const [tierId, setTierId] = useState(initialInputs.tierId);
  const [suggestedAddons, setSuggestedAddons] = useState<string[]>([]);
  const [suggestedInfoNeeds, setSuggestedInfoNeeds] = useState<string[]>([]);
  const [addonDraft, setAddonDraft] = useState("");
  const [infoNeedDraft, setInfoNeedDraft] = useState("");
  const [suggestForFuture, setSuggestForFuture] = useState(true);
  const [sellingPrice, setSellingPrice] = useState(0);
  const [costFields, setCostFields] = useState<
    Record<keyof BidCostBreakdown, string>
  >({
    materials: "",
    labor: "",
    subcontracting: "",
    travelEquipment: "",
    otherDirect: "",
  });
  const [costsManuallyEdited, setCostsManuallyEdited] = useState(false);

  const [items, setItems] = useState<CalculatorLineItem[]>(() =>
    buildInitialContractorLineItems(config, initialInputs.tierId, rates),
  );

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

  const enabledLines = useMemo(
    () => estimate.lines.filter((l) => l.enabled && l.amount > 0),
    [estimate.lines],
  );

  useEffect(() => {
    setSellingPrice(estimate.totalWithMargin);
    if (!costsManuallyEdited) {
      const suggested = suggestCostBreakdownFromLines(enabledLines, fixedAdd);
      setCostFields(costBreakdownToFields(suggested));
    }
  }, [
    estimate.totalWithMargin,
    enabledLines,
    fixedAdd,
    costsManuallyEdited,
  ]);

  const costs = useMemo(
    () => fieldsToCostBreakdown(costFields),
    [costFields],
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

  function applyTier(nextTierId: string) {
    setTierId(nextTierId);
    setItems((prev) => {
      const custom = prev.filter((i) => i.custom);
      const rebuilt = buildInitialContractorLineItems(config, nextTierId, rates);
      return [...rebuilt, ...custom.map((c) => attachReferenceAmounts([c])[0]!)];
    });
  }

  function setAnswer(questionId: string, optionId: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  }

  function updateItem(id: string, patch: Partial<CalculatorLineItem>) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  function addCustomItem() {
    setItems((prev) => [...prev, newCustomLineItem()]);
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

  function handleCostFieldChange(key: keyof BidCostBreakdown, raw: string) {
    setCostsManuallyEdited(true);
    setCostFields((prev) => ({ ...prev, [key]: raw }));
  }

  function handleApply() {
    const price = sellingPrice > 0 ? sellingPrice : estimate.totalWithMargin;
    const profitabilitySummary = computeProfitability(
      price,
      costs,
      rates.hourlyRate,
    );

    onApply({
      subtotal: estimate.subtotal,
      totalWithMargin: price,
      marginPercent: rates.marginPercent,
      lines: estimate.lines.filter((l) => l.enabled),
      primaryQty: clampedPrimary,
      calculatorSlug: config.slug,
      suggestedAddons,
      suggestedInfoNeeds,
      suggestForFutureRequests: suggestForFuture,
      profitability: {
        costs,
        summary: profitabilitySummary,
      },
    });
  }

  return (
    <div className="space-y-6 rounded-2xl border-2 border-sky-200 bg-gradient-to-b from-sky-50/80 to-white p-5 sm:p-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-sky-800">
          {isStandalone ? "Tarjouslaskuri" : "Urakoitsijan tarjouslaskuri"}
        </p>
        <p className="mt-1 text-sm text-stone-600">
          {isStandalone
            ? "Laske tarjous omille asiakkaillesi — sama moottori kuin Remonttireitin tarjouspyynnöissä."
            : "Laske tarjous omilla hinnoillasi ja katteellasi. Sama rakenne kuin asiakkaan vertailussa — viitehinnat auttavat arvioimaan hintatasoa."}
        </p>
      </div>

      {!isStandalone && customerEstimate && (
        <aside className="rounded-xl border border-violet-200 bg-violet-50/70 px-4 py-3 text-sm text-violet-950">
          <p className="font-semibold">Asiakkaan laskuriarvo (viite)</p>
          {(customerEstimate.lowEuros != null &&
            customerEstimate.highEuros != null) ||
          customerEstimate.totalEuros != null ? (
            <p className="mt-1">
              {customerEstimate.lowEuros != null &&
              customerEstimate.highEuros != null ? (
                <>
                  {formatEuro(customerEstimate.lowEuros)} –{" "}
                  {formatEuro(customerEstimate.highEuros)}
                </>
              ) : (
                <>noin {formatEuro(customerEstimate.totalEuros!)}</>
              )}
              {customerEstimate.primaryQty != null &&
                customerEstimate.primaryUnit && (
                  <span className="text-violet-800">
                    {" "}
                    · {customerEstimate.primaryQty} {customerEstimate.primaryUnit}
                  </span>
                )}
            </p>
          ) : null}
          <p className="mt-1 text-xs text-violet-800/90">
            Asiakkaan suuntaa-antava arvio — vertaa omaan tarjoukseesi. Rivikohtaiset
            viitehinnat näkyvät alla.
          </p>
        </aside>
      )}

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

      <CalculatorLineItemsEditor
        config={config}
        items={items}
        adjustedItems={adjustedItems}
        primaryQty={clampedPrimary}
        secondaryQty={clampedSecondary}
        onUpdateItem={updateItem}
        onRemoveItem={removeItem}
        onAddCustomItem={addCustomItem}
        vatTreatment={CONTRACTOR_COST_VAT}
        fixedAdd={fixedAdd}
        compact
        showGoogleSearch={false}
        showReferenceComparison
        description="Valitse mukaan tulevat rivit ja syötä omat hintasi. Jokaisella rivillä näet viitehinnan ja vertailun (edullisempi / lähes sama / kalliimpi). Telineet ja nostotyö ovat oletuksena pois."
      />

      <div className="rounded-xl border border-stone-200 bg-white p-4">
        <p className="text-sm font-semibold text-stone-800">
          Puuttuuko laskurista jokin?
        </p>
        <p className="mt-1 text-xs text-stone-600">
          Yksittäinen ehdotus ei muuta laskuria kaikille. Kun useat urakoitsijat
          pyytävät samaa, se ehdotetaan{" "}
          {isStandalone
            ? "Remonttireitin laskureihin ja tuleville tarjouspyynnöille."
            : "tuleville tarjouspyynnöille."}
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
            Ehdota näitä laskuriin, kun useat urakoitsijat pyytävät samaa
          </span>
        </label>
      </div>

      <BidProfitabilityPanel
        sellingPrice={sellingPrice || estimate.totalWithMargin}
        onSellingPriceChange={setSellingPrice}
        costs={costs}
        costFields={costFields}
        onCostFieldChange={handleCostFieldChange}
        hourlyRate={rates.hourlyRate}
        calculatorEstimateEuros={estimate.subtotal}
        jobBenchmark={jobPriceBenchmark}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <CostBreakdownChart
          segments={chartSegments}
          title="Kustannusjako (ennen katetta)"
          subtitle={`Kate ${rates.marginPercent} % · työtunti ${rates.hourlyRate} €/h`}
          vatTreatment={CONTRACTOR_COST_VAT}
        />
        <div className={`${brand.estimateBox} p-5`}>
          <p className="text-sm font-medium text-sky-800">
            {isStandalone ? "Tarjouksen summa" : "Siirrettävä tarjous"}
          </p>
          <p className="mt-1 text-3xl font-bold text-sky-950">
            {formatEuro(sellingPrice || estimate.totalWithMargin)}
          </p>
          <p className="mt-1">
            <VatLabel
              treatment={CONTRACTOR_COST_VAT}
              className="text-sm text-sky-900/80"
            />
          </p>
          <p className="mt-2 text-sm text-sky-900/90">
            Laskurin ehdotus {formatEuro(estimate.totalWithMargin)} · kustannukset{" "}
            {formatEuro(
              costs.materials +
                costs.labor +
                costs.subcontracting +
                costs.travelEquipment +
                costs.otherDirect,
            )}
          </p>
          <p className="mt-2 text-xs text-sky-900/70">
            {isStandalone
              ? "Valitse ALV-merkintä tarjouslomakkeella — PDF näyttää loppusumman asiakkaalle."
              : "Siirrät summan tarjouslomakkeeseen — valitse siellä ALV-merkintä (sis. ALV tai ALV 0 %)."}
          </p>
          <button
            type="button"
            onClick={handleApply}
            className={`${brand.btnPrimary} mt-4 w-full`}
          >
            {isStandalone
              ? "Tarjous valmis — tarkista tiedot"
              : "Jätä tämä tarjous tarjouspyyntöön"}
          </button>
        </div>
      </div>

      <p className="text-xs text-stone-500">
        Hinnat ALV 0 %: työtunti {rates.hourlyRate} €/h · kate{" "}
        {rates.marginPercent} % · muokkaa Oma tili → Laskentaparametrit.
      </p>
    </div>
  );
}
