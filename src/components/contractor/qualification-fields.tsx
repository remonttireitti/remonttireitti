"use client";

import { useState } from "react";
import { HEAT_PUMP_JOB_SLUGS, HEAT_PUMP_MARKETING } from "@/constants/heat-pumps";
import { normalizeTradeName } from "@/lib/community-trades";
import type { SelectableTrade } from "@/lib/contractor-trade-options";
import type { JobType } from "@/types/job-catalog";
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
  trades: SelectableTrade[];
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
  const [customTradeDraft, setCustomTradeDraft] = useState("");
  const [customTrades, setCustomTrades] = useState<string[]>([]);
  const [customTradeError, setCustomTradeError] = useState<string | null>(null);

  const standardTrades = trades.filter((t) => t.source !== "community");
  const communityTrades = trades.filter((t) => t.source === "community");

  function addCustomTrade() {
    const normalized = normalizeTradeName(customTradeDraft);
    setCustomTradeError(null);

    if (normalized.length < 2) {
      setCustomTradeError("Kirjoita vähintään 2 merkkiä.");
      return;
    }

    const lower = normalized.toLowerCase();
    if (
      trades.some((t) => t.name_fi.toLowerCase() === lower) ||
      customTrades.some((t) => t.toLowerCase() === lower)
    ) {
      setCustomTradeError("Ammatti on jo listalla — valitse se yllä olevista.");
      return;
    }

    setCustomTrades((prev) => [...prev, normalized]);
    setCustomTradeDraft("");
  }

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
          {standardTrades.map((t) => (
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

        {communityTrades.length > 0 && (
          <div className="mt-3 space-y-2 border-t border-stone-200 pt-3">
            <p className="text-xs font-medium text-stone-700">
              Yhteisön lisäämät ammatit
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {communityTrades.map((t) => (
                <label key={t.id} className={labelClass}>
                  <input
                    type="checkbox"
                    name="trade_ids"
                    value={t.id}
                    defaultChecked={defaultTradeIds.includes(t.id)}
                    className="mt-0.5"
                  />
                  <span className="text-sm">
                    {t.name_fi}
                    <span className="ml-1 text-[10px] font-medium uppercase text-violet-700">
                      uusi
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="mt-3 space-y-2 border-t border-stone-200 pt-3">
          <p className="text-xs font-medium text-stone-700">
            Ei listalla? Lisää oma ammattisi
          </p>
          <p className="text-xs text-stone-500">
            Uusi ammatti lisätään valikoimaan kaikille, kun joku ehdottaa sen
            ensimmäisenä.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={customTradeDraft}
              onChange={(e) => {
                setCustomTradeDraft(e.target.value);
                setCustomTradeError(null);
              }}
              placeholder="Esim. aurinkopaneeliasennus"
              className="min-w-0 flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm"
              maxLength={60}
            />
            <button
              type="button"
              onClick={addCustomTrade}
              className="shrink-0 rounded-lg border border-sky-200 bg-white px-4 py-2 text-sm font-medium text-sky-900 hover:bg-sky-50"
            >
              Lisää
            </button>
          </div>
          {customTradeError && (
            <p className="text-xs text-red-600" role="alert">
              {customTradeError}
            </p>
          )}
          {customTrades.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {customTrades.map((name) => (
                <li
                  key={name}
                  className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-900"
                >
                  {name}
                  <button
                    type="button"
                    onClick={() =>
                      setCustomTrades((prev) => prev.filter((t) => t !== name))
                    }
                    className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-full text-violet-700 hover:bg-violet-200/60 hover:text-violet-950"
                    aria-label={`Poista ${name}`}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
          {customTrades.map((name) => (
            <input key={name} type="hidden" name="custom_trade_names" value={name} />
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
