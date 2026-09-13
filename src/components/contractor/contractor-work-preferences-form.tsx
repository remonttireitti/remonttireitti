"use client";

import { useActionState } from "react";
import {
  updateContractorWorkPreferences,
  type ContractorProfileState,
} from "@/app/actions/contractor-profile";
import { brand, formInputClass } from "@/lib/brand-theme";

export function ContractorWorkPreferencesForm({
  minBudgetEur,
  className = "",
}: {
  minBudgetEur: number | null;
  className?: string;
}) {
  const [state, action, pending] = useActionState<
    ContractorProfileState,
    FormData
  >(updateContractorWorkPreferences, {});

  return (
    <form
      action={action}
      className={`${brand.section} space-y-4 p-5 sm:p-6 ${className}`}
    >
      <h2 className={brand.sectionTitle}>Työfiltteri</h2>
      <p className={brand.sectionDesc}>
        Rajaa näytettäviä tarjouspyyntöjä minimibudjetin mukaan. Voit merkitä yksittäisiä
        pyyntöjä kiinnostaviksi tai piilottaa ne suoraan listalta.
      </p>

      <div>
        <label htmlFor="min_budget_eur" className="block text-sm font-medium">
          Minimibudjetti (€)
        </label>
        <input
          id="min_budget_eur"
          name="min_budget_eur"
          type="number"
          min={0}
          step={500}
          placeholder="Esim. 3000 — jätä tyhjäksi jos ei rajaa"
          defaultValue={minBudgetEur ?? ""}
          className={`${formInputClass} max-w-[12rem]`}
        />
        <p className="mt-1 text-xs text-stone-500">
          Oletusnäkymässä piilotetaan pyynnöt, joiden budjetti on selvästi alle minimisi.
          Avoimet budjetit näytetään silti.
        </p>
      </div>

      {state.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="text-sm text-sky-800" role="status">
          {state.ok}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className={`${brand.btnPrimary} disabled:opacity-60`}
      >
        {pending ? "Tallennetaan…" : "Tallenna työfiltteri"}
      </button>
    </form>
  );
}
