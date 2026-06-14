"use client";

import { useState } from "react";
import { PUBLIC_CONTRACTOR_TRADE_SLUGS } from "@/constants/contractor-trades";
import { HEAT_PUMP_JOB_SLUGS, HEAT_PUMP_MARKETING } from "@/constants/heat-pumps";
import type { JobType, Trade } from "@/types/job-catalog";
import {
  ELECTRICAL_QUALIFICATION_OPTIONS,
  LVI_QUALIFICATION_OPTIONS,
  REFRIGERANT_LICENSE_LABELS,
  type ElectricalQualification,
  type LviQualification,
  type RefrigerantLicense,
} from "@/types/contractor";

const fieldsetClass =
  "space-y-3 rounded-xl border border-stone-200 bg-stone-50/50 p-4";
const legendClass = "text-sm font-semibold text-stone-800";
const labelClass =
  "flex cursor-pointer items-start gap-2 rounded-lg border border-stone-200 bg-white p-3 has-checked:border-sky-600 has-checked:bg-sky-50";

type Props = {
  trades: Pick<Trade, "id" | "slug" | "name_fi">[];
  jobTypes: Pick<JobType, "id" | "slug">[];
  defaultTradeIds?: string[];
  defaultJobTypeIds?: string[];
  defaultRefrigerant?: RefrigerantLicense;
  defaultElectrical?: ElectricalQualification | null;
  defaultLvi?: LviQualification[];
};

export function ContractorQualificationFields({
  trades,
  jobTypes,
  defaultTradeIds = [],
  defaultJobTypeIds = [],
  defaultRefrigerant,
  defaultElectrical,
  defaultLvi = [],
}: Props) {
  const [pumpSectionOpen, setPumpSectionOpen] = useState(
    defaultJobTypeIds.length > 0,
  );
  const [lviSelected, setLviSelected] = useState<LviQualification[]>(defaultLvi);

  const tradeOptions = PUBLIC_CONTRACTOR_TRADE_SLUGS.map((slug) =>
    trades.find((t) => t.slug === slug),
  ).filter(Boolean) as Pick<Trade, "id" | "slug" | "name_fi">[];

  const pumpOptions = HEAT_PUMP_JOB_SLUGS.map((slug) => {
    const jt = jobTypes.find((j) => j.slug === slug);
    return jt ? { slug, id: jt.id, title: HEAT_PUMP_MARKETING[slug].title } : null;
  }).filter(Boolean) as { slug: string; id: string; title: string }[];

  function toggleLvi(value: LviQualification, checked: boolean) {
    const opt = LVI_QUALIFICATION_OPTIONS.find((o) => o.value === value);
    if (opt?.exclusive) {
      setLviSelected(checked ? [value] : []);
      return;
    }
    setLviSelected((prev) => {
      const withoutExclusive = prev.filter(
        (v) => v !== "none" && v !== "subcontract",
      );
      if (checked) {
        return [...new Set([...withoutExclusive, value])];
      }
      return withoutExclusive.filter((v) => v !== value);
    });
  }

  return (
    <div className="space-y-4 border-t border-stone-200 pt-4">
      <p className="text-sm font-medium text-stone-800">Urakoitsijan profiili</p>

      <fieldset className={fieldsetClass}>
        <legend className={legendClass}>Ammatit *</legend>
        <p className="text-xs text-stone-500">
          Saat ilmoituksia näihin liittyvistä tarjouspyynnöistä. Oletusnäkymässä
          näytetään vain oman ammatin pyynnöt valitsemaltasi alueelta.
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
          Valitse pumpputyypit — alla kylmäaine, sähkö- ja LVI-pätevyydet.
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
            <legend className={legendClass}>
              Sähköpätevyys (sähkötöiden johtaja) *
            </legend>
            <p className="text-xs text-stone-500">
              SETI/Tukes-pätevyystodistus. Tarkista vaatimukset:{" "}
              <a
                href="https://tukes.fi/sahko/sahkotyot-ja-urakointi/sahkopatevyydet-ja-tyoalueet"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-700 hover:underline"
              >
                Tukes — sähköpätevyydet
              </a>
            </p>
            {ELECTRICAL_QUALIFICATION_OPTIONS.map((opt) => (
              <label key={opt.value} className={labelClass}>
                <input
                  type="radio"
                  name="electrical_qualification"
                  value={opt.value}
                  required
                  defaultChecked={defaultElectrical === opt.value}
                  className="mt-0.5"
                />
                <span>
                  <span className="block text-sm font-medium">{opt.label}</span>
                  <span className="mt-0.5 block text-xs text-stone-500">
                    {opt.hint}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>

          <fieldset className={fieldsetClass}>
            <legend className={legendClass}>LVI- ja putkityöpätevyydet *</legend>
            <p className="text-xs text-stone-500">
              Valitse kaikki jotka sinulla on. Vedeneristys: Rakentamisen
              sertifikaatti (Eurofins), tarkista{" "}
              <a
                href="https://sertifikaattihaku.fi"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-700 hover:underline"
              >
                sertifikaattihaku.fi
              </a>
            </p>
            {LVI_QUALIFICATION_OPTIONS.map((opt) => (
              <label key={opt.value} className={labelClass}>
                <input
                  type="checkbox"
                  name="lvi_qualifications"
                  value={opt.value}
                  checked={lviSelected.includes(opt.value)}
                  onChange={(e) => toggleLvi(opt.value, e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  <span className="block text-sm font-medium">{opt.label}</span>
                  <span className="mt-0.5 block text-xs text-stone-500">
                    {opt.hint}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>
        </>
      )}
    </div>
  );
}
