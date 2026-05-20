"use client";

import { useActionState } from "react";
import {
  updateContractorBilling,
  type ContractorBillingState,
} from "@/app/actions/contractor-billing";

const inputClass =
  "mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-sky-600 focus:outline-none focus:ring-1 focus:ring-sky-600";

type Props = {
  businessId: string;
  billingEmail: string;
  billingAddressLine: string;
  billingPostalCode: string;
  billingCity: string;
};

export function ContractorBillingForm({
  businessId,
  billingEmail,
  billingAddressLine,
  billingPostalCode,
  billingCity,
}: Props) {
  const [state, action, pending] = useActionState<
    ContractorBillingState,
    FormData
  >(updateContractorBilling, {});

  return (
    <form
      action={action}
      className="mt-6 space-y-4 rounded-xl border border-stone-200 bg-white p-6"
    >
      <h2 className="text-lg font-semibold">Laskutustiedot</h2>
      <p className="text-sm text-stone-600">
        Näitä tietoja käytetään, kun lähetämme sinulle välitysmaksulaskun
        kevytyrittäjäpalvelun kautta tarjouksen hyväksynnän jälkeen.
      </p>

      <div>
        <label htmlFor="business_id" className="block text-sm font-medium">
          Y-tunnus
        </label>
        <input
          id="business_id"
          name="business_id"
          type="text"
          defaultValue={businessId}
          placeholder="1234567-8"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="billing_email" className="block text-sm font-medium">
          Laskutus-sähköposti
        </label>
        <input
          id="billing_email"
          name="billing_email"
          type="email"
          defaultValue={billingEmail}
          placeholder="laskutus@yritys.fi"
          className={inputClass}
        />
        <p className="mt-1 text-xs text-stone-500">
          Jos tyhjä, käytetään kirjautumissähköpostiasi.
        </p>
      </div>

      <div>
        <label
          htmlFor="billing_address_line"
          className="block text-sm font-medium"
        >
          Laskutusosoite
        </label>
        <input
          id="billing_address_line"
          name="billing_address_line"
          type="text"
          defaultValue={billingAddressLine}
          className={inputClass}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="billing_postal_code"
            className="block text-sm font-medium"
          >
            Postinumero
          </label>
          <input
            id="billing_postal_code"
            name="billing_postal_code"
            type="text"
            defaultValue={billingPostalCode}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="billing_city" className="block text-sm font-medium">
            Postitoimipaikka
          </label>
          <input
            id="billing_city"
            name="billing_city"
            type="text"
            defaultValue={billingCity}
            className={inputClass}
          />
        </div>
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
        className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-800 disabled:opacity-60"
      >
        {pending ? "Tallennetaan…" : "Tallenna laskutustiedot"}
      </button>
    </form>
  );
}
