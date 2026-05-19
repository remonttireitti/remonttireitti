"use client";

import { HEAT_PUMP_JOB_SLUGS, HEAT_PUMP_MARKETING } from "@/constants/heat-pumps";
import type { JobType } from "@/types/job-catalog";
import {
  REFRIGERANT_LICENSE_LABELS,
  WORK_CAPABILITY_LABELS,
  type RefrigerantLicense,
  type WorkCapability,
} from "@/types/contractor";

const fieldsetClass = "space-y-3 rounded-xl border border-stone-200 bg-stone-50/50 p-4";
const legendClass = "text-sm font-semibold text-stone-800";
const labelClass =
  "flex cursor-pointer items-start gap-2 rounded-lg border border-stone-200 bg-white p-3 has-checked:border-sky-600 has-checked:bg-sky-50";

type Props = {
  jobTypes: Pick<JobType, "id" | "slug">[];
  defaultJobTypeIds?: string[];
  defaultRefrigerant?: RefrigerantLicense;
  defaultElectrical?: WorkCapability;
  defaultLvi?: WorkCapability;
};

export function ContractorQualificationFields({
  jobTypes,
  defaultJobTypeIds = [],
  defaultRefrigerant,
  defaultElectrical,
  defaultLvi,
}: Props) {
  const pumpOptions = HEAT_PUMP_JOB_SLUGS.map((slug) => {
    const jt = jobTypes.find((j) => j.slug === slug);
    return jt ? { slug, id: jt.id, title: HEAT_PUMP_MARKETING[slug].title } : null;
  }).filter(Boolean) as { slug: string; id: string; title: string }[];

  return (
    <div className="space-y-4 border-t border-stone-200 pt-4">
      <p className="text-sm font-medium text-stone-800">Asentajan pätevyydet</p>

      <fieldset className={fieldsetClass}>
        <legend className={legendClass}>Asennan näitä lämpöpumppuja *</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {pumpOptions.map((p) => (
            <label key={p.id} className={labelClass}>
              <input
                type="checkbox"
                name="job_type_ids"
                value={p.id}
                defaultChecked={defaultJobTypeIds.includes(p.id)}
                className="mt-0.5"
              />
              <span className="text-sm">{p.title}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className={fieldsetClass}>
        <legend className={legendClass}>Kylmäainelupa (F-gas) *</legend>
        {(
          Object.entries(REFRIGERANT_LICENSE_LABELS) as [
            RefrigerantLicense,
            string,
          ][]
        ).map(([value, label]) => (
          <label key={value} className={labelClass}>
            <input
              type="radio"
              name="refrigerant_license"
              value={value}
              required
              defaultChecked={defaultRefrigerant === value}
              className="mt-0.5"
            />
            <span className="text-sm">{label}</span>
          </label>
        ))}
      </fieldset>

      <fieldset className={fieldsetClass}>
        <legend className={legendClass}>Sähkötyöt asennuksessa *</legend>
        {(
          Object.entries(WORK_CAPABILITY_LABELS) as [WorkCapability, string][]
        ).map(([value, label]) => (
          <label key={value} className={labelClass}>
            <input
              type="radio"
              name="electrical_capability"
              value={value}
              required
              defaultChecked={defaultElectrical === value}
              className="mt-0.5"
            />
            <span className="text-sm">{label}</span>
          </label>
        ))}
        <p className="text-xs text-stone-500">
          Jos pätevyys ei riitä, voit tarjota vain laitteen ja jätät sähkötyöt
          toiselle — kerro tarjouksessa.
        </p>
      </fieldset>

      <fieldset className={fieldsetClass}>
        <legend className={legendClass}>LVI-työt asennuksessa *</legend>
        {(
          Object.entries(WORK_CAPABILITY_LABELS) as [WorkCapability, string][]
        ).map(([value, label]) => (
          <label key={value} className={labelClass}>
            <input
              type="radio"
              name="lvi_capability"
              value={value}
              required
              defaultChecked={defaultLvi === value}
              className="mt-0.5"
            />
            <span className="text-sm">{label}</span>
          </label>
        ))}
      </fieldset>
    </div>
  );
}
