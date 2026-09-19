"use client";

import Link from "next/link";
import { useActionState, useEffect, useState, useTransition } from "react";
import { recordCalculatorLearningSignals } from "@/app/actions/calculator-learning";
import {
  saveContractorQuote,
  type ContractorQuoteActionState,
} from "@/app/actions/contractor-quotes";
import { ContractorBidCalculator } from "@/components/calculator/contractor-bid-calculator";
import { ContractorQuotePdfDownloadButton } from "@/components/contractor/contractor-quote-pdf-download";
import { brand } from "@/lib/brand-theme";
import type { BidCalculatorResult } from "@/lib/bid-calculator-bridge";
import type { ContractorQuotePdfUsage } from "@/lib/contractor-quote-limits";
import {
  bidResultFromQuote,
  calculatorItemsFromQuote,
  formFieldsFromQuote,
  quoteUsesCustomTerms,
} from "@/lib/contractor-quote-edit";
import {
  defaultQuoteFormForConfig,
  type ContractorQuoteFormFields,
  type ContractorQuoteRow,
} from "@/lib/contractor-quote-types";
import type { ContractorPricingRates } from "@/lib/calculators/contractor-pricing";
import { formatEuro } from "@/lib/calculators/math";
import type { CalculatorConfig } from "@/lib/calculators/types";
import { VatLabel } from "@/components/price/price-with-vat";
import { CONSUMER_VAT } from "@/lib/vat-label";

const inputClass =
  "mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm focus:border-sky-600 focus:outline-none focus:ring-1 focus:ring-sky-600";

export function StandaloneQuoteWorkspace({
  config,
  rates,
  pdfUsage,
  jobSlug,
  defaultValidityDays = 30,
  defaultTerms = "",
  initialQuote = null,
}: {
  config: CalculatorConfig;
  rates: ContractorPricingRates;
  pdfUsage: ContractorQuotePdfUsage;
  jobSlug?: string | null;
  defaultValidityDays?: number;
  defaultTerms?: string;
  /** Existing contractor_quotes row — reopen for update (fields stay editable). */
  initialQuote?: ContractorQuoteRow | null;
}) {
  const [fields, setFields] = useState<ContractorQuoteFormFields>(() =>
    initialQuote
      ? formFieldsFromQuote(initialQuote)
      : defaultQuoteFormForConfig(config.title, {
          terms: defaultTerms,
          validityDays: defaultValidityDays,
        }),
  );
  const [editTerms, setEditTerms] = useState(() =>
    initialQuote ? quoteUsesCustomTerms(initialQuote, defaultTerms) : false,
  );
  const [calculatorResult, setCalculatorResult] =
    useState<BidCalculatorResult | null>(() =>
      initialQuote ? bidResultFromQuote(initialQuote) : null,
    );
  const [savedQuoteId, setSavedQuoteId] = useState<string | null>(
    () => initialQuote?.id ?? null,
  );
  const initialLineItems = initialQuote
    ? calculatorItemsFromQuote(initialQuote)
    : null;
  const initialPrimaryQty = initialQuote?.primary_qty ?? undefined;
  const [, startLearning] = useTransition();
  const [saveState, saveAction, savePending] = useActionState<
    ContractorQuoteActionState,
    FormData
  >(saveContractorQuote, {});

  function updateField<K extends keyof ContractorQuoteFormFields>(
    key: K,
    value: ContractorQuoteFormFields[K],
  ) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  function handleCalculatorReady(result: BidCalculatorResult) {
    setCalculatorResult(result);

    if (
      result.suggestForFutureRequests &&
      (result.suggestedAddons.length > 0 || result.suggestedInfoNeeds.length > 0)
    ) {
      const fd = new FormData();
      fd.set("calculator_slug", result.calculatorSlug);
      fd.set("job_slug", jobSlug ?? result.calculatorSlug);
      fd.set("addons_json", JSON.stringify(result.suggestedAddons));
      fd.set("info_needs_json", JSON.stringify(result.suggestedInfoNeeds));
      fd.set("as_suggestion", "1");
      startLearning(() => {
        void recordCalculatorLearningSignals({}, fd);
      });
    }

    document
      .getElementById("quote-completion")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  useEffect(() => {
    if (saveState.quoteId) {
      setSavedQuoteId(saveState.quoteId);
    }
  }, [saveState.quoteId]);

  const effectiveQuoteId = saveState.quoteId ?? savedQuoteId;
  const isEditingExisting = Boolean(effectiveQuoteId);
  const hasDefaultTerms = Boolean(defaultTerms.trim());
  const termsForSave = editTerms ? fields.terms : defaultTerms;

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-stone-900">Asiakas ja kohde</h2>
        <p className="mt-1 text-sm text-stone-600">
          {isEditingExisting
            ? "Asiakas- ja kohdetiedot on lukittu tallennuksen jälkeen. Voit päivittää ehtoja ja hintoja — Päivitä tallentaa samaan tarjoukseen."
            : "Nämä tiedot näkyvät PDF-tarjouksessa. Voit täydentää ne myöhemmin."}
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-2">
            <span className="font-medium">Tarjouksen otsikko *</span>
            <input
              value={fields.title}
              onChange={(e) => updateField("title", e.target.value)}
              className={inputClass}
              placeholder="Kattoremontti – omakotitalo"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Asiakas</span>
            <input
              value={fields.clientName}
              onChange={(e) => updateField("clientName", e.target.value)}
              className={inputClass}
              placeholder="Matti Meikäläinen"
              readOnly={isEditingExisting}
              disabled={isEditingExisting}
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Sähköposti</span>
            <input
              type="email"
              value={fields.clientEmail}
              onChange={(e) => updateField("clientEmail", e.target.value)}
              className={inputClass}
              placeholder="asiakas@esimerkki.fi"
              readOnly={isEditingExisting}
              disabled={isEditingExisting}
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Paikkakunta</span>
            <input
              value={fields.siteMunicipality}
              onChange={(e) => updateField("siteMunicipality", e.target.value)}
              className={inputClass}
              placeholder="Espoo"
              readOnly={isEditingExisting}
              disabled={isEditingExisting}
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Kohteen osoite</span>
            <input
              value={fields.siteAddress}
              onChange={(e) => updateField("siteAddress", e.target.value)}
              className={inputClass}
              placeholder="Esimerkkikatu 1"
              readOnly={isEditingExisting}
              disabled={isEditingExisting}
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Voimassaolo (päivää)</span>
            <input
              type="number"
              min={1}
              max={365}
              value={fields.validityDays}
              onChange={(e) =>
                updateField(
                  "validityDays",
                  Number.parseInt(e.target.value, 10) || defaultValidityDays,
                )
              }
              className={`${inputClass} max-w-[8rem]`}
            />
            <span className="mt-1 block text-xs text-stone-500">
              Oletus yrityksen asetuksista: {defaultValidityDays} pv
            </span>
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="font-medium">Huomiot tarjouksessa</span>
            <textarea
              value={fields.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              rows={2}
              className={inputClass}
              placeholder="Esim. ei sisällä sähkötyötä"
            />
          </label>

          <div className="sm:col-span-2 space-y-2 rounded-xl border border-stone-200 bg-stone-50/80 p-4">
            <p className="text-sm font-medium text-stone-900">Tarjouksen ehdot</p>
            <p className="text-xs text-stone-600">
              Esitäytetty yrityksen oletusehdoista (Oma tili → Tarjouksen
              oletusehdot). Voit pitää oletukset tai muokata vain tätä tarjousta.
            </p>
            {hasDefaultTerms ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <label className="flex items-center gap-2 text-sm text-stone-800">
                  <input
                    type="radio"
                    name="terms_mode"
                    checked={!editTerms}
                    onChange={() => {
                      setEditTerms(false);
                      updateField("terms", defaultTerms);
                    }}
                  />
                  Käytä yrityksen oletusehtoja
                </label>
                <label className="flex items-center gap-2 text-sm text-stone-800">
                  <input
                    type="radio"
                    name="terms_mode"
                    checked={editTerms}
                    onChange={() => {
                      setEditTerms(true);
                      if (!fields.terms.trim()) {
                        updateField("terms", defaultTerms);
                      }
                    }}
                  />
                  Muokkaa ehtoja tähän tarjoukseen
                </label>
              </div>
            ) : (
              <p className="text-xs text-amber-800">
                Yrityksellä ei ole vielä oletusehtoja. Voit kirjoittaa ehdot tähän
                tai tallentaa ne ensin Oma tili -asetuksiin.
              </p>
            )}
            {(editTerms || !hasDefaultTerms) && (
              <textarea
                value={fields.terms}
                onChange={(e) => {
                  setEditTerms(true);
                  updateField("terms", e.target.value);
                }}
                rows={5}
                className={inputClass}
                placeholder="Maksuehdot, takuut, peruutusehdot…"
              />
            )}
            {!editTerms && hasDefaultTerms && (
              <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs text-stone-700">
                {defaultTerms}
              </pre>
            )}
          </div>

          <label className="flex items-start gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={fields.vatIncluded}
              onChange={(e) => updateField("vatIncluded", e.target.checked)}
              className="mt-1"
            />
            <span>
              Hinnat <VatLabel treatment={CONSUMER_VAT} inline /> (PDF näyttää
              ALV-erittelyn asiakkaalle)
            </span>
          </label>
        </div>
      </section>

      <ContractorBidCalculator
        config={config}
        rates={rates}
        variant="standalone"
        initialPrimaryQty={initialPrimaryQty}
        initialLineItems={initialLineItems}
        onApply={handleCalculatorReady}
      />

      {calculatorResult && (
        <section
          id="quote-completion"
          className="scroll-mt-24 rounded-2xl border-2 border-emerald-200 bg-gradient-to-b from-emerald-50/80 to-white p-5 sm:p-6"
        >
          <h2 className="text-lg font-semibold text-emerald-950">
            {isEditingExisting ? "Muokkaa tarjousta" : "Tarjous valmis"}
          </h2>
          <p className="mt-1 text-sm text-stone-600">
            Summa{" "}
            <strong>{formatEuro(calculatorResult.totalWithMargin)}</strong> ·{" "}
            {pdfUsage.remaining} / {pdfUsage.limit} PDF-tarjousta jäljellä (
            {pdfUsage.monthLabel})
          </p>

          <form action={saveAction} className="mt-4 space-y-4">
            <input type="hidden" name="title" value={fields.title} />
            <input type="hidden" name="client_name" value={fields.clientName} />
            <input
              type="hidden"
              name="client_email"
              value={fields.clientEmail}
            />
            <input
              type="hidden"
              name="site_municipality"
              value={fields.siteMunicipality}
            />
            <input type="hidden" name="site_address" value={fields.siteAddress} />
            <input type="hidden" name="notes" value={fields.notes} />
            <input type="hidden" name="terms" value={termsForSave} />
            <input
              type="hidden"
              name="validity_days"
              value={String(fields.validityDays)}
            />
            {fields.vatIncluded && (
              <input type="hidden" name="vat_included" value="on" />
            )}
            <input
              type="hidden"
              name="calculator_slug"
              value={config.slug}
            />
            {jobSlug && <input type="hidden" name="job_slug" value={jobSlug} />}
            <input
              type="hidden"
              name="calculator_result_json"
              value={JSON.stringify(calculatorResult)}
            />
            {effectiveQuoteId && (
              <input type="hidden" name="quote_id" value={effectiveQuoteId} />
            )}

            {saveState.error && (
              <p className="text-sm text-red-600" role="alert">
                {saveState.error}
              </p>
            )}
            {saveState.success && (
              <p className="text-sm text-emerald-800" role="status">
                {saveState.success}
              </p>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={savePending || !fields.title.trim()}
                className={`${brand.btnPrimary} disabled:opacity-60`}
              >
                {savePending
                  ? isEditingExisting
                    ? "Päivitetään…"
                    : "Tallennetaan…"
                  : isEditingExisting
                    ? "Päivitä"
                    : "Tallenna"}
              </button>

              {effectiveQuoteId && (
                <ContractorQuotePdfDownloadButton
                  quoteId={effectiveQuoteId}
                  className="inline-flex items-center rounded-xl border border-emerald-300 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-900 hover:bg-emerald-50 disabled:opacity-60"
                />
              )}

              {!effectiveQuoteId && pdfUsage.remaining === 0 && (
                <span className="text-sm text-amber-800">
                  PDF-raja täynnä tässä kuussa.
                </span>
              )}

              <Link
                href="/tarjoukset"
                className="inline-flex items-center rounded-xl px-4 py-2.5 text-sm font-medium text-sky-800 hover:underline"
              >
                Remonttireitin tarjouspyynnöt →
              </Link>
            </div>
          </form>

          {!effectiveQuoteId && (
            <p className="mt-3 text-xs text-stone-500">
              Tallenna ennen PDF-latausta. PDF-lataus lasketaan kuukausirajaan
              (10 kpl/kk).
            </p>
          )}
          {effectiveQuoteId && (
            <p className="mt-3 text-xs text-stone-500">
              Päivitä tallentaa muutokset tähän tarjoukseen (ei luo uutta).
            </p>
          )}
        </section>
      )}

      <aside className="rounded-xl border border-stone-200 bg-stone-50/80 px-4 py-3 text-xs leading-relaxed text-stone-600">
        <strong className="text-stone-800">Tietosuoja ja oppiminen.</strong>{" "}
        Anonymisoituja hinta- ja laajuustietoja voidaan käyttää
        Remonttireitin laskureiden ja hintaluokkien kehittämiseen. Remonttireitin
        tarjouspyynnöistä ja toteutuneista töistä oppiva data pysyy
        alustan kilpailuetuna — ulkopuoliset tarjoukset eivät paljasta
        yksittäisten asiakkaiden tietoja.
      </aside>
    </div>
  );
}
