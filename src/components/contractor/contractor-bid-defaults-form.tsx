"use client";

import { useActionState } from "react";
import {
  updateContractorBidDefaults,
  type ContractorProfileState,
} from "@/app/actions/contractor-profile";
import type { ContractorBidDefaults } from "@/lib/contractor-bid-defaults-shared";

const inputClass =
  "mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-sky-600 focus:outline-none focus:ring-1 focus:ring-sky-600";

export function ContractorBidDefaultsForm({
  defaults,
}: {
  defaults: ContractorBidDefaults;
}) {
  const [state, action, pending] = useActionState<
    ContractorProfileState,
    FormData
  >(updateContractorBidDefaults, {});

  return (
    <form
      action={action}
      className="mt-6 space-y-4 rounded-xl border border-stone-200 bg-white p-6"
    >
      <h2 className="text-lg font-semibold">Tarjouksen oletusehdot</h2>
      <p className="text-sm text-stone-600">
        Nämä täyttyvät automaattisesti uuteen tarjoukseen. Voit muokata niitä
        jokaisella tarjouspyynnöllä.
      </p>

      <div>
        <label htmlFor="default_scope_terms" className="block text-sm font-medium">
          Asennuksen laajuus
        </label>
        <textarea
          id="default_scope_terms"
          name="default_scope_terms"
          rows={4}
          defaultValue={defaults.scope_terms}
          className={inputClass}
        />
      </div>

      <div>
        <label
          htmlFor="default_contract_terms"
          className="block text-sm font-medium"
        >
          Sopimusehdot
        </label>
        <textarea
          id="default_contract_terms"
          name="default_contract_terms"
          rows={4}
          defaultValue={defaults.contract_terms}
          className={inputClass}
        />
      </div>

      <div>
        <label
          htmlFor="default_warranty_work"
          className="block text-sm font-medium"
        >
          Takuu työlle
        </label>
        <textarea
          id="default_warranty_work"
          name="default_warranty_work"
          rows={2}
          defaultValue={defaults.warranty_work}
          className={inputClass}
        />
      </div>

      <div>
        <label
          htmlFor="default_warranty_equipment"
          className="block text-sm font-medium"
        >
          Takuu laitteelle
        </label>
        <textarea
          id="default_warranty_equipment"
          name="default_warranty_equipment"
          rows={2}
          defaultValue={defaults.warranty_equipment}
          className={inputClass}
        />
      </div>

      {state.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="text-sm text-sky-700" role="status">
          {state.ok}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-900 disabled:opacity-60"
      >
        {pending ? "Tallennetaan…" : "Tallenna oletusehdot"}
      </button>
    </form>
  );
}
