"use client";

import { activateContractorAccount } from "@/app/actions/account";

export function ActivateContractorForm({
  defaultCompany,
}: {
  defaultCompany?: string;
}) {
  return (
    <form action={activateContractorAccount} className="mt-6 space-y-4">
      <p className="text-sm text-stone-700">
        Rekisteröidyit urakoitsijana, mutta rooli jäi korjaamatta. Paina alla —
        korjaamme tilin ilman uutta rekisteröitymistä.
      </p>
      <div>
        <label htmlFor="company_name" className="block text-sm font-medium">
          Yrityksen nimi
        </label>
        <input
          id="company_name"
          name="company_name"
          type="text"
          required
          defaultValue={defaultCompany ?? ""}
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
        />
      </div>
      <button
        type="submit"
        className="w-full rounded-lg bg-orange-600 py-2.5 font-medium text-white hover:bg-orange-700"
      >
        Aktivoi urakoitsijatili
      </button>
    </form>
  );
}
