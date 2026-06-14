"use client";

import { useState } from "react";
import { PUBLIC_CONTRACTOR_TRADE_SLUGS } from "@/constants/contractor-trades";
import { HEAT_PUMP_JOB_SLUGS, HEAT_PUMP_MARKETING } from "@/constants/heat-pumps";
import type { JobType, Trade } from "@/types/job-catalog";
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
  trades: Pick<Trade, "id" | "slug" | "name_fi">[];
  jobTypes: Pick<JobType, "id" | "slug">[];
  defaultTradeIds?: string[];
  defaultJobTypeIds?: string[];
  defaultRefrigerant?: RefrigerantLicense;
  defaultElectrical?: WorkCapability;
  defaultLvi?: WorkCapability;
};

export function ContractorQualificationFields({
  trades,
  jobTypes,
  defaultTradeIds = [],
  defaultJobTypeIds = [],
  defaultRefrigerant,
  defaultElectrical,
  defaultLvi,
}: Props) {
  const [pumpSectionOpen, setPumpSectionOpen] = useState(
    defaultJobTypeIds.length > 0,
  );

  const tradeOptions = PUBLIC_CONTRACTOR_TRADE_SLUGS.map((slug) =>
    trades.find((t) => t.slug === slug),
  ).filter(Boolean) as Pick<Trade, "id" | "slug" | "name_fi">[];

  const pumpOptions = HEAT_PUMP_JOB_SLUGS.map((slug) => {
    const jt = jobTypes.find((j) => j.slug === slug);
    return jt ? { slug, id: jt.id, title: HEAT_PUMP_MARKETING[slug].title } : null;
  }).filter(Boolean) as { slug: string; id: string; title: string }[];

  return (
    <div className="space-y-4 border-t border-stone-200 pt-4">
      <p className="text-sm font-medium text-stone-800">Urakoitsijan profiili</p>

      <fieldset className={fieldsetClass}>
        <legend className={legendClass}>Ammatit *</legend>
        <p className="text-xs text-stone-500">
          Saat ilmoituksia näihin liittyvistä tarjouspyynnöistä.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {tradeOptions.map((t) => (
            <label key={t.id} className={labelClass}>
              <input
                type="checkbox"
                name="trade_ids"
                value={t.id}
                defaultChecked={defaultTradeIds.includes(t.id)}
                className="mt-0.5"
              />
              <span className="text-sm">{t.name_fi}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className={fieldsetClass}>
        <legend className={legendClass}>Lämpöpumput (valinnainen)</legend>
        <p className="text-xs text-stone-500">
          Valitse vain jos asennat lämpöpumppuja — tarkemmat pätevyydet alla.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {pumpOptions.map((p) => (
            <label key={p.id} className={labelClass}>
              <input
                type="checkbox"
                name="job_type_ids"
                value={p.id}
                defaultChecked={defaultJobTypeIds.includes(p.id)}
                className="mt-0.5"
                onChange={(e) => {
                  if (e.target.checked) setPumpSectionOpen(true);
                }}
              />
              <span className="text-sm">{p.title}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {pumpSectionOpen && (
        <>
          <fieldset className={fieldsetClass}>
            <legend className={legendClass}>Kylmäainelupa (F-gas)</legend>
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
                  defaultChecked={defaultRefrigerant === value}
                  className="mt-0.5"
                />
                <span className="text-sm">{label}</span>
              </label>
            ))}
          </fieldset>

          <fieldset className={fieldsetClass}>
            <legend className={legendClass}>Sähkötyöt asennuksessa</legend>
            {(
              Object.entries(WORK_CAPABILITY_LABELS) as [WorkCapability, string][]
            ).map(([value, label]) => (
              <label key={value} className={labelClass}>
                <input
                  type="radio"
                  name="electrical_capability"
                  value={value}
                  defaultChecked={defaultElectrical === value}
                  className="mt-0.5"
                />
                <span className="text-sm">{label}</span>
              </label>
            ))}
          </fieldset>

          <fieldset className={fieldsetClass}>
            <legend className={legendClass}>LVI-työt asennuksessa</legend>
            {(
              Object.entries(WORK_CAPABILITY_LABELS) as [WorkCapability, string][]
            ).map(([value, label]) => (
              <label key={value} className={labelClass}>
                <input
                  type="radio"
                  name="lvi_capability"
                  value={value}
                  defaultChecked={defaultLvi === value}
                  className="mt-0.5"
                />
                <span className="text-sm">{label}</span>
              </label>
            ))}
          </fieldset>
        </>
      )}
    </div>
  );
}
