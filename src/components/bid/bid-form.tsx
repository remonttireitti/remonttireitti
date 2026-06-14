"use client";

import {
  useActionState,
  useEffect,
  useState,
  startTransition,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  submitBid,
  updateBid,
  type BidActionState,
} from "@/app/actions/bids";
import {
  bidFormTotalEuros,
  extractBidFormFields,
  initialBidFormFields,
  type BidFormFieldKey,
  type BidFormFields,
  validateBidFormClient,
} from "@/lib/bid-form";
import { BidCommitmentNotice } from "@/components/bid/bid-commitment-notice";
import { BidTermsTemplatePicker } from "@/components/bid/bid-terms-template-picker";
import {
  applyBidDefaultsToFields,
  type ContractorBidDefaults,
} from "@/lib/contractor-bid-defaults-shared";
import type { BidTermTemplateTarget } from "@/lib/bid-term-templates";
import {
  bidAmountExceedsBudget,
  buildOverBudgetConfirmMessage,
  getOverBudgetBlockError,
  type ProjectBudgetInfo,
} from "@/lib/project-budget";
import {
  bidOfferScopeAmountLabel,
  type BidOfferScope,
} from "@/lib/bid-offer-scope";
import {
  defaultServicePricingModel,
  SERVICE_PRICING_MODEL_LABELS,
  suggestedServicePricingModels,
  type ServiceEngagement,
} from "@/lib/service-engagement";
import type { ProjectTradeContext } from "@/lib/project-trades-server";

const inputClass =
  "mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 focus:border-sky-600 focus:outline-none focus:ring-1 focus:ring-sky-600";

const inputErrorClass =
  "mt-1 w-full rounded-lg border border-red-400 px-3 py-2 focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600";

function todayForInput(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fieldClass(hasError: boolean): string {
  return hasError ? inputErrorClass : inputClass;
}

export function BidForm({
  projectId,
  requiresDeviceAndInstallation,
  allowOptionalEquipmentOffer,
  mode = "create",
  bidId,
  initialFields,
  budgetInfo,
  defaultBidTerms,
  jobTypeSlug,
  tradeContext,
  serviceEngagement,
}: {
  projectId: string;
  /** Urakoitsija toimittaa laitteet (pakollinen laitetakuu). */
  requiresDeviceAndInstallation: boolean;
  /** Asiakas hankkii itse, mutta sallii valinnaisen laitetarjouksen. */
  allowOptionalEquipmentOffer: boolean;
  mode?: "create" | "edit";
  bidId?: string;
  initialFields?: BidFormFields;
  budgetInfo: ProjectBudgetInfo;
  /** Oma tili -sivulla tallennetut oletukset (vain uusi tarjous). */
  defaultBidTerms?: ContractorBidDefaults;
  /** Tarjouspyynnön lämpöpumppu — suodattaa valmiit mallit. */
  jobTypeSlug?: string | null;
  /** Moniammatillisen kohteen ammatit urakoitsijan näkökulmasta. */
  tradeContext?: ProjectTradeContext;
  /** Jatkuva palvelu — hinnoittelu per käynti / kk / kausi. */
  serviceEngagement?: ServiceEngagement | null;
}) {
  const isServiceProject = Boolean(serviceEngagement);
  const [fields, setFields] = useState<BidFormFields>(() => {
    const base = initialFields ?? initialBidFormFields(
      serviceEngagement
        ? defaultServicePricingModel(serviceEngagement)
        : "",
    );
    if (initialFields || !defaultBidTerms) return base;
    return applyBidDefaultsToFields(base, defaultBidTerms);
  });
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<BidFormFieldKey, string>>
  >({});
  const [clientError, setClientError] = useState<string | null>(null);

  const saveAction = mode === "edit" ? updateBid : submitBid;

  const router = useRouter();
  const [state, formAction, pending] = useActionState<BidActionState, FormData>(
    saveAction,
    {},
  );

  useEffect(() => {
    if (initialFields) {
      setFields(initialFields);
    }
  }, [initialFields]);

  useEffect(() => {
    if (state.fields) {
      setFields(state.fields);
    }
    if (state.fieldErrors) {
      setFieldErrors(state.fieldErrors);
    }
  }, [state.fields, state.fieldErrors]);

  function applyTemplate(
    key: BidTermTemplateTarget,
    text: string,
    mode: "append" | "replace",
  ) {
    setFields((prev) => {
      const current = prev[key];
      const next =
        mode === "replace"
          ? text
          : current.trim()
            ? `${current.trim()}\n\n${text}`
            : text;
      return { ...prev, [key]: next };
    });
  }

  function update<K extends BidFormFieldKey>(key: K, value: BidFormFields[K]) {
    setFields((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setClientError(null);
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const extracted = extractBidFormFields(fd);
    setFields(extracted);

    const validation = validateBidFormClient(extracted, {
      requiresEquipmentWarranty: false,
      allowOptionalEquipmentOffer,
      requiresDeviceAndInstallation,
      requiresOfferScope: tradeContext?.isMultiTrade ?? false,
      requiresServicePricing: isServiceProject,
    });
    if (!validation.ok) {
      setClientError(validation.error);
      setFieldErrors(validation.fieldErrors);
      return;
    }

    const amountEuros = bidFormTotalEuros(extracted);
    const blockError = getOverBudgetBlockError(amountEuros, budgetInfo);
    if (blockError) {
      setClientError(blockError);
      setFieldErrors({ amount_euros: blockError });
      return;
    }

    const confirmMsg = buildOverBudgetConfirmMessage(amountEuros, budgetInfo);
    if (confirmMsg && !window.confirm(confirmMsg)) {
      return;
    }

    setClientError(null);
    setFieldErrors({});
    startTransition(() => {
      formAction(fd);
    });
  }

  const workEuros = Number(fields.amount_euros) || 0;
  const equipEuros =
    fields.offers_equipment && fields.equipment_amount_euros
      ? Number(fields.equipment_amount_euros) || 0
      : 0;
  const amountEuros = bidFormTotalEuros(fields);
  const overBudget =
    budgetInfo.budgetMaxEur != null &&
    bidAmountExceedsBudget(amountEuros, budgetInfo);
  const blockedOverBudget =
    overBudget && getOverBudgetBlockError(amountEuros, budgetInfo) != null;

  const displayError = clientError ?? state.error;
  const isMultiTrade = tradeContext?.isMultiTrade ?? false;

  function setOfferScope(scope: BidOfferScope) {
    update("offer_scope", scope);
  }

  const amountLabel = isServiceProject && fields.service_pricing_model
    ? `${SERVICE_PRICING_MODEL_LABELS[fields.service_pricing_model]} (€) *`
    : bidOfferScopeAmountLabel(
        fields.offer_scope || null,
        isMultiTrade,
        allowOptionalEquipmentOffer,
        requiresDeviceAndInstallation,
      );

  const servicePricingOptions = serviceEngagement
    ? suggestedServicePricingModels(serviceEngagement)
    : [];

  return (
    <form onSubmit={handleSubmit} noValidate lang="fi" className="space-y-4">
      <input type="hidden" name="project_id" value={projectId} />
      {fields.offer_scope && (
        <input type="hidden" name="offer_scope" value={fields.offer_scope} />
      )}
      <input
        type="hidden"
        name="requires_equipment_warranty"
        value={
          requiresDeviceAndInstallation || fields.offers_equipment ? "1" : "0"
        }
      />
      {bidId && <input type="hidden" name="bid_id" value={bidId} />}

      {isMultiTrade && tradeContext && (
        <fieldset className="space-y-3 rounded-xl border border-sky-200 bg-sky-50/50 p-4">
          <legend className="px-1 text-sm font-semibold text-sky-950">
            Tarjouksen laajuus *
          </legend>
          <p className="text-xs leading-relaxed text-sky-900/80">
            Kohde vaatii useita ammatteja (
            {tradeContext.projectTradeNames.join(", ")}). Kerro tarjoatko
            kokonaisuuden vai vain oman osuutesi
            {tradeContext.contractorTradeNames.length > 0 && (
              <>
                {" "}
                (
                {tradeContext.contractorTradeNames.join(", ")})
              </>
            )}
            .
          </p>
          <div className="space-y-2">
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-transparent bg-white/80 px-3 py-2.5 has-[:checked]:border-sky-400 has-[:checked]:bg-white">
              <input
                type="radio"
                name="offer_scope_choice"
                checked={fields.offer_scope === "turnkey"}
                onChange={() => setOfferScope("turnkey")}
                className="mt-0.5"
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-stone-900">
                  Kokonaisurakka
                </span>
                <span className="mt-0.5 block text-xs text-stone-600">
                  Vastaat koko remontista tai koordinoit alihankkijat. Hinta
                  koskee koko urakkaa.
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-transparent bg-white/80 px-3 py-2.5 has-[:checked]:border-sky-400 has-[:checked]:bg-white">
              <input
                type="radio"
                name="offer_scope_choice"
                checked={fields.offer_scope === "own_trade"}
                onChange={() => setOfferScope("own_trade")}
                className="mt-0.5"
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-stone-900">
                  Vain oman ammattini osuus
                </span>
                <span className="mt-0.5 block text-xs text-stone-600">
                  Tarjoat vain oman ammattisi työt. Kuvaa rajaukset selkeästi
                  laajuuskentässä — asiakas voi yhdistää useita tarjouksia.
                </span>
              </span>
            </label>
          </div>
          {fieldErrors.offer_scope && (
            <p className="text-sm text-red-600" role="alert">
              {fieldErrors.offer_scope}
            </p>
          )}
        </fieldset>
      )}

      {isServiceProject && (
        <fieldset className="space-y-3 rounded-xl border border-violet-200 bg-violet-50/40 p-4">
          <legend className="px-1 text-sm font-semibold text-violet-950">
            Palvelun hinnoittelu *
          </legend>
          <p className="text-xs leading-relaxed text-violet-900/80">
            Asiakas kilpailuttaa palvelusopimuksen. Välitysmaksu peritään
            kertaluonteisesti hyväksytyn tarjouksen yhteydessä — toistuvat
            käynnit hoidetaan suoraan asiakkaan ja palveluntarjoajan välillä.
          </p>
          <div className="space-y-2">
            {servicePricingOptions.map((model) => (
              <label
                key={model}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-transparent bg-white/80 px-3 py-2.5 has-[:checked]:border-violet-400 has-[:checked]:bg-white"
              >
                <input
                  type="radio"
                  name="service_pricing_model_choice"
                  checked={fields.service_pricing_model === model}
                  onChange={() => update("service_pricing_model", model)}
                  className="mt-0.5"
                />
                <span className="text-sm text-stone-800">
                  {SERVICE_PRICING_MODEL_LABELS[model]}
                </span>
              </label>
            ))}
          </div>
          {fields.service_pricing_model && (
            <input
              type="hidden"
              name="service_pricing_model"
              value={fields.service_pricing_model}
            />
          )}
          {fieldErrors.service_pricing_model && (
            <p className="text-sm text-red-600" role="alert">
              {fieldErrors.service_pricing_model}
            </p>
          )}
        </fieldset>
      )}

      <div>
        <label htmlFor="amount_euros" className="block text-sm font-medium">
          {amountLabel}
        </label>
        <input
          id="amount_euros"
          name="amount_euros"
          type="number"
          min={1}
          step={1}
          value={fields.amount_euros}
          onChange={(e) => update("amount_euros", e.target.value)}
          className={fieldClass(!!fieldErrors.amount_euros || blockedOverBudget)}
          placeholder="15000"
          aria-invalid={!!fieldErrors.amount_euros}
          aria-describedby={
            fieldErrors.amount_euros ? "amount_euros-error" : undefined
          }
        />
        {fieldErrors.amount_euros && (
          <p id="amount_euros-error" className="mt-1 text-sm text-red-600">
            {fieldErrors.amount_euros}
          </p>
        )}
        {blockedOverBudget && (
          <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
            Hinta ylittää asiakkaan hintatoiveen (
            {budgetInfo.budgetMaxEur!.toLocaleString("fi-FI")} €). Asiakas ei
            hyväksy tarjouksia tämän yli — tarjousta ei voi lähettää tällä
            hinnalla.
          </p>
        )}
        {overBudget && !blockedOverBudget && (
          <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950">
            Hinta ylittää asiakkaan hintatoiveen (
            {budgetInfo.budgetMaxEur!.toLocaleString("fi-FI")} €). Lähetyksessä
            kysytään vahvistus.
          </p>
        )}
      </div>

      <div>
        <label htmlFor="estimated_days" className="block text-sm font-medium">
          Arvioitu kesto (päivää)
        </label>
        <input
          id="estimated_days"
          name="estimated_days"
          type="number"
          min={1}
          value={fields.estimated_days}
          onChange={(e) => update("estimated_days", e.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label
          htmlFor="earliest_start_date"
          className="block text-sm font-medium"
        >
          Ensimmäinen mahdollinen toteutuspäivä *
        </label>
        <input
          id="earliest_start_date"
          name="earliest_start_date"
          type="date"
          min={todayForInput()}
          value={fields.earliest_start_date}
          onChange={(e) => update("earliest_start_date", e.target.value)}
          className={fieldClass(!!fieldErrors.earliest_start_date)}
          aria-invalid={!!fieldErrors.earliest_start_date}
          aria-describedby={
            fieldErrors.earliest_start_date
              ? "earliest_start_date-error"
              : undefined
          }
        />
        {fieldErrors.earliest_start_date && (
          <p
            id="earliest_start_date-error"
            className="mt-1 text-sm text-red-600"
          >
            {fieldErrors.earliest_start_date}
          </p>
        )}
      </div>

      <fieldset className="space-y-4 rounded-xl border border-stone-200 bg-stone-50/80 p-4">
        <legend className="px-1 text-sm font-semibold text-stone-800">
          Ehdot ja laajuus
        </legend>
        <p className="text-xs text-stone-600">
          Selkeät ehdot auttavat asiakasta vertailemaan tarjouksia. Käytä valmiita
          malleja tai omaa tekstiä — voit tallentaa oletukset Oma tili -sivulla.
        </p>

        <div>
          <label htmlFor="scope_terms" className="block text-sm font-medium">
            {fields.offer_scope === "own_trade" && isMultiTrade
              ? "Oman ammattisi osuuden laajuus (mitä hinta sisältää)"
              : fields.offer_scope === "turnkey" && isMultiTrade
                ? "Kokonaisurakan laajuus (mitä hinta sisältää)"
                : "Asennuksen laajuus (mitä hinta sisältää)"}
          </label>
          <textarea
            id="scope_terms"
            name="scope_terms"
            rows={5}
            value={fields.scope_terms}
            onChange={(e) => update("scope_terms", e.target.value)}
            className={inputClass}
            placeholder={
              fields.offer_scope === "own_trade"
                ? "Esim. sähkökiukaan asennus ja kytkentä — ei sisällä rakennustöitä tai putkityötä…"
                : fields.offer_scope === "turnkey"
                  ? "Esim. kylpyhuone kokonaisuudessaan: purku, putket, vesieristys, laatoitus, kalusteet…"
                  : "Esim. perusasennus, putket, käyttöönotto, mitä ei sisälly…"
            }
          />
          <BidTermsTemplatePicker
            target="scope_terms"
            jobTypeSlug={jobTypeSlug}
            onApply={(text, mode) => applyTemplate("scope_terms", text, mode)}
          />
        </div>

        <div>
          <label htmlFor="contract_terms" className="block text-sm font-medium">
            Sopimusehdot (maksu, peruutus, viivästykset)
          </label>
          <textarea
            id="contract_terms"
            name="contract_terms"
            rows={4}
            value={fields.contract_terms}
            onChange={(e) => update("contract_terms", e.target.value)}
            className={inputClass}
            placeholder="Esim. ennakkomaksu, laskuehto, peruutus…"
          />
          <BidTermsTemplatePicker
            target="contract_terms"
            jobTypeSlug={jobTypeSlug}
            onApply={(text, mode) =>
              applyTemplate("contract_terms", text, mode)
            }
          />
        </div>

        <div>
          <label htmlFor="warranty_work" className="block text-sm font-medium">
            Takuuehdot työlle *
          </label>
          <textarea
            id="warranty_work"
            name="warranty_work"
            rows={3}
            value={fields.warranty_work}
            onChange={(e) => update("warranty_work", e.target.value)}
            className={fieldClass(!!fieldErrors.warranty_work)}
            placeholder="Esim. asennustyölle 2 vuoden takuu…"
            aria-invalid={!!fieldErrors.warranty_work}
            aria-describedby={
              fieldErrors.warranty_work ? "warranty_work-error" : undefined
            }
          />
          <BidTermsTemplatePicker
            target="warranty_work"
            jobTypeSlug={jobTypeSlug}
            onApply={(text, mode) => applyTemplate("warranty_work", text, mode)}
          />
          {fieldErrors.warranty_work && (
            <p id="warranty_work-error" className="mt-1 text-sm text-red-600">
              {fieldErrors.warranty_work}
            </p>
          )}
        </div>
      </fieldset>

      {allowOptionalEquipmentOffer && !requiresDeviceAndInstallation && (
        <div className="space-y-3 rounded-xl border border-sky-100 bg-sky-50/50 p-4">
          <label className="flex items-start gap-2 text-sm font-medium text-stone-900">
            <input
              type="checkbox"
              name="offers_equipment"
              checked={fields.offers_equipment}
              onChange={(e) => update("offers_equipment", e.target.checked)}
              className="mt-1"
            />
            Tarjoan myös laitetta (erillinen hinta)
          </label>
          <p className="text-xs text-stone-600">
            Asiakas suunnittelee hankkivansa laitteen itse, mutta voi valita
            tarjouksesi, jos sisältää laitteen.
          </p>
          {fields.offers_equipment && (
            <>
              <p className="rounded-lg bg-white px-3 py-2 text-sm text-stone-700">
                <span className="font-medium">Yhteensä tarjouksessa:</span>{" "}
                {(workEuros + equipEuros).toLocaleString("fi-FI")} € (asennus{" "}
                {workEuros.toLocaleString("fi-FI")} € + laite{" "}
                {equipEuros.toLocaleString("fi-FI")} €)
              </p>
              <div>
                <label
                  htmlFor="equipment_amount_euros"
                  className="block text-sm font-medium"
                >
                  Laitteen hinta (€, sis. ALV) *
                </label>
                <input
                  id="equipment_amount_euros"
                  name="equipment_amount_euros"
                  type="number"
                  min={1}
                  step={1}
                  value={fields.equipment_amount_euros}
                  onChange={(e) =>
                    update("equipment_amount_euros", e.target.value)
                  }
                  className={fieldClass(!!fieldErrors.equipment_amount_euros)}
                  placeholder="8000"
                />
                {fieldErrors.equipment_amount_euros && (
                  <p className="mt-1 text-sm text-red-600">
                    {fieldErrors.equipment_amount_euros}
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor="equipment_description"
                  className="block text-sm font-medium"
                >
                  Laite / toimitus *
                </label>
                <input
                  id="equipment_description"
                  name="equipment_description"
                  type="text"
                  value={fields.equipment_description}
                  onChange={(e) =>
                    update("equipment_description", e.target.value)
                  }
                  className={fieldClass(!!fieldErrors.equipment_description)}
                  placeholder="Esim. Mitsubishi Zubadan 5 kW, toimitus kohteeseen"
                />
                {fieldErrors.equipment_description && (
                  <p className="mt-1 text-sm text-red-600">
                    {fieldErrors.equipment_description}
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {requiresDeviceAndInstallation ||
      (allowOptionalEquipmentOffer && fields.offers_equipment) ? (
        <div>
          <label
            htmlFor="warranty_equipment"
            className="block text-sm font-medium"
          >
            Takuuehdot laitteelle *
          </label>
          <textarea
            id="warranty_equipment"
            name="warranty_equipment"
            rows={3}
            value={fields.warranty_equipment}
            onChange={(e) => update("warranty_equipment", e.target.value)}
            className={fieldClass(!!fieldErrors.warranty_equipment)}
            placeholder="Esim. valmistajan takuu 5 vuotta, asennustakuu 2 vuotta…"
            aria-invalid={!!fieldErrors.warranty_equipment}
            aria-describedby={
              fieldErrors.warranty_equipment
                ? "warranty_equipment-error"
                : undefined
            }
          />
          <BidTermsTemplatePicker
            target="warranty_equipment"
            jobTypeSlug={jobTypeSlug}
            onApply={(text, mode) =>
              applyTemplate("warranty_equipment", text, mode)
            }
          />
          {fieldErrors.warranty_equipment && (
            <p
              id="warranty_equipment-error"
              className="mt-1 text-sm text-red-600"
            >
              {fieldErrors.warranty_equipment}
            </p>
          )}
        </div>
      ) : (
        <p className="rounded-lg bg-stone-100 px-3 py-2 text-sm text-stone-600">
          Asiakas hankkii laitteet itse — laitetakuuta ei tarvitse ilmoittaa, ellei
          tarjoa laitetta yllä.
        </p>
      )}

      <div>
        <label htmlFor="message" className="block text-sm font-medium">
          Viesti asiakkaalle *
        </label>
        <textarea
          id="message"
          name="message"
          rows={4}
          value={fields.message}
          onChange={(e) => update("message", e.target.value)}
          className={fieldClass(!!fieldErrors.message)}
          placeholder="Kerro mitä hinta sisältää ja muut huomiot…"
          aria-invalid={!!fieldErrors.message}
          aria-describedby={fieldErrors.message ? "message-error" : undefined}
        />
        {fieldErrors.message && (
          <p id="message-error" className="mt-1 text-sm text-red-600">
            {fieldErrors.message}
          </p>
        )}
      </div>

      <fieldset className="space-y-3 rounded-lg border border-stone-200 bg-stone-50 p-4">
        <legend className="px-1 text-sm font-medium text-stone-800">
          Vakuutukset *
        </legend>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            name="confirms_licenses"
            checked={fields.confirms_licenses}
            onChange={(e) => update("confirms_licenses", e.target.checked)}
            className="mt-1"
            aria-invalid={!!fieldErrors.confirms_licenses}
          />
          <span>
            Vakuutan, että yritykselläni on tarvittavat luvat ja pätevyydet
            tähän työhön.
          </span>
        </label>
        {fieldErrors.confirms_licenses && (
          <p className="text-sm text-red-600">{fieldErrors.confirms_licenses}</p>
        )}
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            name="confirms_building_standards"
            checked={fields.confirms_building_standards}
            onChange={(e) =>
              update("confirms_building_standards", e.target.checked)
            }
            className="mt-1"
            aria-invalid={!!fieldErrors.confirms_building_standards}
          />
          <span>
            Vakuutan, että noudatamme töissä yleisiä rakennusvaatimuksia ja
            hyviä rakennustapoja.
          </span>
        </label>
        {fieldErrors.confirms_building_standards && (
          <p className="text-sm text-red-600">
            {fieldErrors.confirms_building_standards}
          </p>
        )}
      </fieldset>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="vat_included"
          checked={fields.vat_included}
          onChange={(e) => update("vat_included", e.target.checked)}
        />
        Hinta sisältää ALV:n
      </label>

      <BidCommitmentNotice mode={mode} />

      {displayError && (
        <p className="text-sm text-red-600" role="alert">
          {displayError}
        </p>
      )}
      {state.success && (
        <p
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
          role="status"
        >
          {state.success}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || blockedOverBudget}
        className="w-full rounded-lg bg-orange-700 py-2.5 font-medium text-white hover:bg-orange-800 disabled:opacity-60"
      >
        {pending
          ? mode === "edit"
            ? "Tallennetaan…"
            : "Lähetetään…"
          : mode === "edit"
            ? "Tallenna muutokset"
            : "Lähetä tarjous"}
      </button>
    </form>
  );
}
