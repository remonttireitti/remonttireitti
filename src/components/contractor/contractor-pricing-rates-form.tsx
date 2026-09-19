"use client";

import { useActionState } from "react";
import {
  updateContractorPricingRates,
  type ContractorProfileState,
} from "@/app/actions/contractor-profile";
import { brand, formInputClass } from "@/lib/brand-theme";
import type { ContractorPricingRates } from "@/lib/calculators/contractor-pricing";

const inputClass = formInputClass;

export function ContractorPricingRatesForm({
  rates,
  className = "",
}: {
  rates: ContractorPricingRates;
  className?: string;
}) {
  const [state, action, pending] = useActionState<
    ContractorProfileState,
    FormData
  >(updateContractorPricingRates, {});

  return (
    <form action={action} className={`${brand.section} p-5 sm:p-6 ${className}`}>
      <h3 className={brand.sectionTitle}>Tarjouslaskurin hinnat</h3>
      <p className="mt-2 text-sm leading-relaxed text-stone-600">
        Määritä kerran omat laskentaparametrisi. Kun avaat tarjouspyynnön,
        laskuri täyttää asiakkaan tiedot ja laskee tarjouksen omilla hinnoillasi
        — erillään kuluttajan suuntaa-antavista arvioista.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium text-stone-700">Työtunti (€/h)</span>
          <input
            type="number"
            name="hourly_rate"
            min={1}
            step={1}
            defaultValue={rates.hourlyRate}
            className={`${inputClass} mt-1`}
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-stone-700">Kate (%)</span>
          <input
            type="number"
            name="margin_percent"
            min={0}
            max={100}
            step={0.5}
            defaultValue={rates.marginPercent}
            className={`${inputClass} mt-1`}
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-stone-700">Jätehuolto (€)</span>
          <input
            type="number"
            name="waste_fee"
            min={0}
            step={10}
            defaultValue={rates.wasteFee}
            className={`${inputClass} mt-1`}
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-stone-700">Telineet / nostotyö (€)</span>
          <input
            type="number"
            name="scaffolding_fee"
            min={0}
            step={50}
            defaultValue={rates.scaffoldingFee}
            className={`${inputClass} mt-1`}
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-stone-700">Matka (€/km)</span>
          <input
            type="number"
            name="travel_per_km"
            min={0}
            step={0.05}
            defaultValue={rates.travelPerKm}
            className={`${inputClass} mt-1`}
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-stone-700">
            Oletusmatka työmaalle (km)
          </span>
          <input
            type="number"
            name="travel_km"
            min={0}
            step={1}
            defaultValue={rates.travelKm}
            className={`${inputClass} mt-1`}
          />
          <span className="mt-1 block text-xs text-stone-500">
            Käytetään tarjouslaskurissa, jos et muokkaa matkaa erikseen.
          </span>
        </label>
      </div>

      {state.error && (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="mt-4 text-sm text-emerald-700" role="status">
          {state.ok}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className={`${brand.btnPrimary} mt-5`}
      >
        {pending ? "Tallennetaan…" : "Tallenna laskentaparametrit"}
      </button>
    </form>
  );
}
