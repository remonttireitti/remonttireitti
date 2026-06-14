"use client";

import { useActionState } from "react";
import {
  updateContractorQualifications,
  type ContractorProfileState,
} from "@/app/actions/contractor-profile";
import { ContractorQualificationFields } from "@/components/contractor/qualification-fields";
import { brand, formInputClass } from "@/lib/brand-theme";
import type { JobType, Trade } from "@/types/job-catalog";
import type {
  ElectricalQualification,
  LviQualification,
  RefrigerantLicense,
} from "@/types/contractor";

const inputClass = formInputClass;

type Props = {
  trades: Pick<Trade, "id" | "slug" | "name_fi">[];
  jobTypes: Pick<JobType, "id" | "slug">[];
  companyName: string;
  tradeIds: string[];
  jobTypeIds: string[];
  refrigerantLicense: RefrigerantLicense | null;
  electricalQualification: ElectricalQualification | null;
  lviQualifications: LviQualification[];
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
  className = "",
}: Props & { className?: string }) {
  const [state, action, pending] = useActionState<
    ContractorProfileState,
    FormData
  >(updateContractorQualifications, {});

  return (
    <form
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
