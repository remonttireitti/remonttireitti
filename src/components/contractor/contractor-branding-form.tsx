"use client";

import Image from "next/image";
import { useActionState } from "react";
import {
  updateContractorBranding,
  type ContractorBrandingState,
} from "@/app/actions/contractor-branding";
import { CONTRACTOR_DESCRIPTION_MAX } from "@/lib/contractor-branding";
import { brand, formInputClass } from "@/lib/brand-theme";

const inputClass = formInputClass;

export function ContractorBrandingForm({
  description,
  logoUrl,
  defaultQuoteValidityDays = 30,
  className = "",
  id,
}: {
  description: string;
  logoUrl: string | null;
  defaultQuoteValidityDays?: number;
  className?: string;
  id?: string;
}) {
  const [state, action, pending] = useActionState<
    ContractorBrandingState,
    FormData
  >(updateContractorBranding, {});

  return (
    <form
      id={id}
      action={action}
      encType="multipart/form-data"
      className={`${brand.section} space-y-4 p-5 sm:p-6 ${className}`}
    >
      <h2 className={brand.sectionTitle}>Logo, esittely ja voimassaolo</h2>
      <p className={brand.sectionDesc}>
        Logo ja esittely näkyvät PDF-tarjouksessa ja julkisessa
        yritysprofiilissa. Voimassaoloaika täytetään oletuksena uusiin
        tarjouksiin.
      </p>

      <div>
        <span className="block text-sm font-medium">Yrityksen logo</span>
        {logoUrl ? (
          <div className="mt-2 flex items-center gap-4">
            <div className="relative h-16 w-32 overflow-hidden rounded-lg border border-stone-200 bg-white p-2">
              <Image
                src={logoUrl}
                alt="Nykyinen logo"
                fill
                className="object-contain object-left"
                unoptimized
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-stone-700">
              <input type="checkbox" name="remove_logo" className="rounded" />
              Poista logo
            </label>
          </div>
        ) : (
          <p className="mt-1 text-xs text-stone-500">
            Ei logoa vielä — suositus: vaakasuunta, max 2 Mt (JPG/PNG/WebP).
          </p>
        )}
        <input
          type="file"
          name="logo"
          accept="image/jpeg,image/png,image/webp"
          className="mt-2 block w-full max-w-md text-sm text-stone-600 file:mr-3 file:rounded-lg file:border-0 file:bg-sky-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-sky-900"
        />
      </div>

      <div>
        <label htmlFor="company_description" className="block text-sm font-medium">
          Esittelyteksti
        </label>
        <textarea
          id="company_description"
          name="description"
          rows={4}
          maxLength={CONTRACTOR_DESCRIPTION_MAX}
          defaultValue={description}
          className={inputClass}
          placeholder="Esimerkki: Olemme perheyritys Espoosta — kattoremontit ja ulkoverhoukset yli 15 vuoden kokemuksella."
        />
        <p className="mt-1 text-xs text-stone-500">
          Enintään {CONTRACTOR_DESCRIPTION_MAX} merkkiä. Näkyy PDF-tarjouksen
          yläosassa ja yritysprofiilissa.
        </p>
      </div>

      <div>
        <label
          htmlFor="default_quote_validity_days"
          className="block text-sm font-medium"
        >
          Tarjouksen oletusvoimassaolo (päivää)
        </label>
        <input
          id="default_quote_validity_days"
          name="default_quote_validity_days"
          type="number"
          min={1}
          max={365}
          defaultValue={defaultQuoteValidityDays}
          className={`${inputClass} max-w-[8rem]`}
        />
        <p className="mt-1 text-xs text-stone-500">
          Käytetään uusissa tarjouslaskurin tarjouksissa. Voit muuttaa arvoa
          yksittäiselle tarjoukselle ennen tallennusta.
        </p>
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
        {pending ? "Tallennetaan…" : "Tallenna logo, esittely ja voimassaolo"}
      </button>
    </form>
  );
}
