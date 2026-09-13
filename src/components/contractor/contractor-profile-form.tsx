"use client";

import { useActionState } from "react";
import {
  updateContractorQualifications,
  type ContractorProfileState,
} from "@/app/actions/contractor-profile";
import { ContractorCompanyFactsFields } from "@/components/contractor/contractor-company-facts-fields";
import { ContractorQualificationFields } from "@/components/contractor/qualification-fields";
import type { CompanySizeBand } from "@/lib/contractor-company-facts";
import { brand, formInputClass } from "@/lib/brand-theme";
import type { SelectableTrade } from "@/lib/contractor-trade-options";
import type { JobType } from "@/types/job-catalog";
import type {
  ElectricalQualification,
  LviQualification,
  RefrigerantLicense,
} from "@/types/contractor";

const inputClass = formInputClass;

type Props = {
  trades: SelectableTrade[];
  jobTypes: Pick<JobType, "id" | "slug">[];
  companyName: string;
  tradeIds: string[];
  jobTypeIds: string[];
  refrigerantLicense: RefrigerantLicense | null;
  electricalQualification: ElectricalQualification | null;
  lviQualifications: LviQualification[];
  foundedYear?: number | null;
  companySizeBand?: CompanySizeBand | null;
  requireCompanyFacts?: boolean;
};

export function ContractorProfileForm({
  trades,
  jobTypes,
  companyName,
  tradeIds,
  jobTypeIds,
  refrigerantLicense,
  electricalQualification,
  lviQualifications,
  foundedYear = null,
  companySizeBand = null,
  requireCompanyFacts = false,
  className = "",
  id,
}: Props & { className?: string; id?: string }) {
  const [state, action, pending] = useActionState<
    ContractorProfileState,
    FormData
  >(updateContractorQualifications, {});

  return (
    <form
      id={id}
      action={action}
      className={`${brand.section} space-y-4 p-5 sm:p-6 ${className}`}
    >
      <h2 className={brand.sectionTitle}>Urakoitsijan profiili</h2>
      <p className={brand.sectionDesc}>
        Näitä tietoja käytetään, kun asiakkaat vertailevat tarjouksia ja kun
        lähetämme sinulle uusia pyyntöjä.
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
          defaultValue={companyName}
          className={inputClass}
        />
      </div>

      <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-4">
        <h3 className="text-sm font-semibold text-stone-900">Yritystiedot</h3>
        <p className="mt-1 text-xs text-stone-600">
          Näkyvät asiakkaalle tarjousvertailussa — sama tyyppinen tieto kuin
          tarjouspyynnön laadussa.
        </p>
        <div className="mt-3">
          <ContractorCompanyFactsFields
            foundedYear={foundedYear}
            companySizeBand={companySizeBand}
            required={requireCompanyFacts}
            inputClassName={inputClass}
          />
        </div>
      </div>

      <ContractorQualificationFields
        trades={trades}
        jobTypes={jobTypes}
        defaultTradeIds={tradeIds}
        defaultJobTypeIds={jobTypeIds}
        defaultRefrigerant={refrigerantLicense ?? undefined}
        defaultElectrical={electricalQualification}
        defaultLvi={lviQualifications}
      />

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
        {pending ? "Tallennetaan…" : "Tallenna profiili"}
      </button>
    </form>
  );
}
