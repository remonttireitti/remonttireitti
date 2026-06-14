"use client";

import { useActionState } from "react";
import {
  updateContractorBilling,
  type ContractorBillingState,
} from "@/app/actions/contractor-billing";
import { brand, formInputClass } from "@/lib/brand-theme";

const inputClass = formInputClass;

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
  className = "",
}: Props & { className?: string }) {
  const [state, action, pending] = useActionState<
    ContractorBillingState,
    FormData
  >(updateContractorBilling, {});

  return (
    <form
      action={action}
      className={`${brand.section} space-y-4 p-5 sm:p-6 ${className}`}
    >
      <h2 className={brand.sectionTitle}>Laskutustiedot</h2>
      <p className={brand.sectionDesc}>
        Näitä tietoja käytetään välitysmaksulaskuun tarjouksen hyväksynnän jälkeen.
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
        <p
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
          role="status"
        >
          {state.ok}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className={`${brand.btnPrimary} disabled:opacity-60`}
      >
        {pending ? "Tallennetaan…" : "Tallenna laskutustiedot"}
      </button>
    </form>
  );
}
