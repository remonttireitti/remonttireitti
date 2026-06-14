"use client";

import { formInputClass } from "@/lib/brand-theme";

type Props = {
  budgetMax: string;
  onBudgetMaxChange: (value: string) => void;
  /** true = suosin alle, korkeammat sallittu; false = en hyväksy yli */
  acceptOffersOverBudget: boolean;
  onAcceptOffersOverBudgetChange: (value: boolean) => void;
  inputId?: string;
};

export function BudgetPreferenceFields({
  budgetMax,
  onBudgetMaxChange,
  acceptOffersOverBudget,
  onAcceptOffersOverBudgetChange,
  inputId = "budget_max",
}: Props) {
  const hasLimit = budgetMax.trim().length > 0 && Number(budgetMax) > 0;

  return (
    <div className="space-y-3 rounded-xl border border-stone-200 bg-stone-50/60 p-4">
      <div>
        <label htmlFor={inputId} className="block text-sm font-medium text-stone-900">
          Hintatoive (€)
        </label>
        <p className="mt-1 text-xs leading-relaxed text-stone-500">
          Valinnainen. Auttaa urakoitsijoita arvioimaan, sopivatko he tarjoukseensa
          budettiisi.
        </p>
        <input
          id={inputId}
          type="number"
          min={0}
          step={100}
          value={budgetMax}
          onChange={(e) => onBudgetMaxChange(e.target.value)}
          className={`${formInputClass} mt-2 max-w-xs`}
          placeholder="Esim. 15000"
        />
      </div>

      {hasLimit && (
        <fieldset className="space-y-2 border-t border-stone-200 pt-3">
          <legend className="text-xs font-medium text-stone-700">
            Miten suhtaudut tarjouksiin, jotka ylittävät {Number(budgetMax).toLocaleString("fi-FI")} €?
          </legend>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-transparent bg-white px-3 py-2.5 has-[:checked]:border-sky-300 has-[:checked]:ring-1 has-[:checked]:ring-sky-200">
            <input
              type="radio"
              name="budget_offer_preference"
              checked={acceptOffersOverBudget}
              onChange={() => onAcceptOffersOverBudgetChange(true)}
              className="mt-0.5"
            />
            <span className="text-sm">
              <span className="font-medium text-stone-900">
                Suosin tarjouksia alle tämän
              </span>
              <span className="mt-0.5 block text-xs text-stone-500">
                Korkeammat tarjoukset sallittu — urakoitsija voi tarjota yli, mutta
                näet erikseen budjetin ylittävät hinnat.
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-transparent bg-white px-3 py-2.5 has-[:checked]:border-sky-300 has-[:checked]:ring-1 has-[:checked]:ring-sky-200">
            <input
              type="radio"
              name="budget_offer_preference"
              checked={!acceptOffersOverBudget}
              onChange={() => onAcceptOffersOverBudgetChange(false)}
              className="mt-0.5"
            />
            <span className="text-sm">
              <span className="font-medium text-stone-900">
                En hyväksy tarjouksia yli tämän
              </span>
              <span className="mt-0.5 block text-xs text-stone-500">
                Urakoitsija ei voi lähettää tarjousta, jos hinta ylittää summan.
              </span>
            </span>
          </label>
        </fieldset>
      )}

      <input
        type="hidden"
        name="accept_offers_over_budget"
        value={acceptOffersOverBudget ? "yes" : "no"}
      />
    </div>
  );
}

export function formatBudgetSummaryLabel(
  budgetMax: string,
  acceptOffersOverBudget: boolean,
): string | null {
  const max = Number(budgetMax);
  if (!budgetMax.trim() || !Number.isFinite(max) || max <= 0) return null;
  const formatted = max.toLocaleString("fi-FI");
  if (acceptOffersOverBudget) {
    return `Suosin tarjouksia alle ${formatted} € (korkeammat sallittu)`;
  }
  return `En hyväksy tarjouksia yli ${formatted} €`;
}
