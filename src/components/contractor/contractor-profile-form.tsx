"use client";

import { useActionState } from "react";
import {
  updateContractorQualifications,
  type ContractorProfileState,
} from "@/app/actions/contractor-profile";
import { ContractorQualificationFields } from "@/components/contractor/qualification-fields";
import type { JobType } from "@/types/job-catalog";
import type {
  RefrigerantLicense,
  WorkCapability,
} from "@/types/contractor";

const inputClass =
  "mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-sky-600 focus:outline-none focus:ring-1 focus:ring-sky-600";

type Props = {
  jobTypes: Pick<JobType, "id" | "slug">[];
  companyName: string;
  jobTypeIds: string[];
  refrigerantLicense: RefrigerantLicense | null;
  electricalCapability: WorkCapability | null;
  lviCapability: WorkCapability | null;
};

export function ContractorProfileForm({
  jobTypes,
  companyName,
  jobTypeIds,
  refrigerantLicense,
  electricalCapability,
  lviCapability,
  className = "",
}: Props & { className?: string }) {
  const [state, action, pending] = useActionState<
    ContractorProfileState,
    FormData
  >(updateContractorQualifications, {});

  return (
    <form
      action={action}
      className={`space-y-4 rounded-xl border border-stone-200 bg-white p-4 sm:p-6 ${className || "mt-6"}`}
    >
      <h2 className="text-lg font-semibold">Asentajan pätevyydet</h2>
      <p className="text-sm text-stone-600">
        Näitä tietoja käytetään, kun asiakkaat vertailevat tarjouksia.
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
        jobTypes={jobTypes}
        defaultJobTypeIds={jobTypeIds}
        defaultRefrigerant={refrigerantLicense ?? undefined}
        defaultElectrical={electricalCapability ?? undefined}
        defaultLvi={lviCapability ?? undefined}
      />

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
        className="rounded-lg bg-orange-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-orange-800 disabled:opacity-60"
      >
        {pending ? "Tallennetaan…" : "Tallenna pätevyydet"}
      </button>
    </form>
  );
}
