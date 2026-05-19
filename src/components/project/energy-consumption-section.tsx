"use client";

import { useMemo } from "react";
import {
  CheckboxGrid,
  FieldGrid,
  FieldGroup,
  formInputClass,
} from "@/components/project/form-layout";
import { DhwRecommendation } from "@/components/project/dhw-recommendation";
import {
  consumptionIncludesDhwNote,
  providesDomesticHotWater,
} from "@/lib/domestic-hot-water";
import {
  computeEnergyComparison,
  ELECTRICITY_OTHER_LOAD_OPTIONS,
  getConsumptionField,
} from "@/lib/heating-energy";
import { brand } from "@/lib/brand-theme";
import type { PumpSizingVariant } from "@/lib/heat-pump-sizing";
import { effectiveHeatDistribution } from "@/lib/heating-system-details";
import type { HeatingSystemDetails } from "@/types/heating-system-details";
import type { CurrentHeatingType } from "@/types/heating-energy";

type Props = {
  details: HeatingSystemDetails;
  onChange: (d: HeatingSystemDetails) => void;
  sizingVariant: PumpSizingVariant;
  /** Korvaus- tai rinnalle-skenaario: näytä kulutusvertailu */
  showHistoricalComparison: boolean;
};

function barWidth(value: number, max: number): string {
  if (max <= 0) return "0%";
  return `${Math.min(100, Math.round((value / max) * 100))}%`;
}

export function EnergyConsumptionSection({
  details: d,
  onChange,
  sizingVariant,
  showHistoricalComparison,
}: Props) {
  const set = <K extends keyof HeatingSystemDetails>(
    key: K,
    value: HeatingSystemDetails[K],
  ) => onChange({ ...d, [key]: value });

  const heatingType =
    d.installation_scenario === "alongside"
      ? d.alongside_heating_type
      : d.current_heating_type;

  const consumptionField = getConsumptionField(heatingType);
  const showElectricityLoads = heatingType === "electricity";
  const dhwNote = consumptionIncludesDhwNote(heatingType);
  const showDhwPlan = providesDomesticHotWater(sizingVariant);

  const comparison = useMemo(
    () =>
      computeEnergyComparison({
        heatingType,
        annualConsumption: d.annual_consumption_amount,
        electricityOtherLoads: d.electricity_other_loads,
        householdSize: d.household_size,
        heatedAreaM2: d.heated_area_m2,
        climateZone: d.climate_zone,
        buildYear: d.build_year,
        heatDistribution: effectiveHeatDistribution(d),
        variant: sizingVariant,
        blendTowardHistory: d.energy_blend_toward_history,
      }),
    [
      heatingType,
      d.annual_consumption_amount,
      d.electricity_other_loads,
      d.household_size,
      d.heated_area_m2,
      d.climate_zone,
      d.build_year,
      d.heat_distribution,
      sizingVariant,
      d.energy_blend_toward_history,
    ],
  );

  const showElectricityComparison =
    comparison.comparesElectricityBill &&
    comparison.historicalHeatingElectricityKwh !== null &&
    comparison.futureHeatingElectricityKwh !== null;

  const maxElectricBar = Math.max(
    comparison.historicalHeatingElectricityKwh ?? 0,
    comparison.futureHeatingElectricityKwh ?? 0,
    1,
  );

  function toggleElectricityLoad(id: (typeof d.electricity_other_loads)[number]) {
    const has = d.electricity_other_loads.includes(id);
    set(
      "electricity_other_loads",
      has
        ? d.electricity_other_loads.filter((x) => x !== id)
        : [...d.electricity_other_loads, id],
    );
  }

  if (!showHistoricalComparison || !heatingType) {
    return (
      <p className="text-xs text-stone-500">
        Valitse nykyinen lämmitys asennustilanteessa, niin voit syöttää
        aiemman kulutuksen ja vertailla arvioon.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {consumptionField && (
        <FieldGrid cols={2}>
          <FieldGroup
            label={`${consumptionField.label} (${consumptionField.unit})`}
            hint={
              dhwNote
                ? `${dhwNote} Keskiarvo aiemmilta vuosilta.`
                : "Keskiarvo aiemmilta vuosilta"
            }
          >
            <input
              type="number"
              min={0}
              step={consumptionField.step}
              placeholder={consumptionField.placeholder}
              value={d.annual_consumption_amount ?? ""}
              onChange={(e) =>
                set(
                  "annual_consumption_amount",
                  e.target.value ? Number(e.target.value) : null,
                )
              }
              className={formInputClass}
            />
          </FieldGroup>
          <FieldGroup label="Kuinka monen vuoden keskiarvo?">
            <select
              value={d.consumption_average_years}
              onChange={(e) =>
                set(
                  "consumption_average_years",
                  Number(e.target.value) as 1 | 2 | 3,
                )
              }
              className={formInputClass}
            >
              <option value={1}>1 vuosi</option>
              <option value={2}>2 vuotta</option>
              <option value={3}>3 vuotta</option>
            </select>
          </FieldGroup>
        </FieldGrid>
      )}

      {showElectricityLoads && (
        <FieldGroup
          label="Muut merkittävät sähkönkuluttajat"
          hint="Esim. sauna tai sähköauto — ei käyttövettä (se on aina sähköllä sähkölämmityksessä)"
        >
          <CheckboxGrid
            options={ELECTRICITY_OTHER_LOAD_OPTIONS.map((o) => ({
              value: o.value,
              label: `${o.label} (n. ${o.kwhPerYear.toLocaleString("fi-FI")} kWh/v)`,
            }))}
            selected={d.electricity_other_loads}
            onToggle={(v) =>
              toggleElectricityLoad(v as (typeof d.electricity_other_loads)[number])
            }
          />
        </FieldGroup>
      )}

      {showDhwPlan && (
        <DhwRecommendation
          householdSize={d.household_size}
          variant={sizingVariant}
        />
      )}

      {comparison.heatingElectricBreakdown && (
        <p className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-700">
          {comparison.heatingElectricBreakdown}
        </p>
      )}

      {showElectricityComparison && (
        <div className={`rounded-xl border border-sky-200 p-4 ${brand.estimateBox}`}>
          <p className="text-sm font-semibold text-sky-950">
            Sähkölaskun vertailu (lämmitys)
          </p>
          <p className="mt-1 text-xs leading-relaxed text-sky-900/90">
            Lämpöpumppu tuottaa saman lämmön noin {comparison.cop} kWh lämmöllä
            yhtä sähkökWh:tä kohden (COP).
          </p>
          <div className="mt-4 space-y-3 text-sm">
            <ComparisonBar
              label="Sähkö nyt (lämmitys)"
              value={comparison.historicalHeatingElectricityKwh!}
              width={barWidth(
                comparison.historicalHeatingElectricityKwh!,
                maxElectricBar,
              )}
              tone="stone"
            />
            <ComparisonBar
              label="Sähkö arvio lämpöpumpulla"
              value={comparison.futureHeatingElectricityKwh!}
              width={barWidth(
                comparison.futureHeatingElectricityKwh!,
                maxElectricBar,
              )}
              tone="future"
              emphasized
            />
          </div>
          {comparison.electricitySavingsKwh !== null &&
            comparison.electricitySavingsPercent !== null && (
              <p className={`mt-3 ${brand.savingsBox}`}>
                Arvioitu säästö lämmityssähkössä: n.{" "}
                {comparison.electricitySavingsKwh.toLocaleString("fi-FI")} kWh/v
                ({comparison.electricitySavingsPercent} %)
              </p>
            )}
        </div>
      )}

      <FieldGroup label="Lisätiedot kulutuksesta (valinnainen)">
        <textarea
          rows={2}
          value={d.energy_consumption_notes}
          onChange={(e) => set("energy_consumption_notes", e.target.value)}
          placeholder="Esim. poikkeuksellinen talvi, remontti kesken vuotta…"
          className={formInputClass}
        />
      </FieldGroup>
    </div>
  );
}

function ComparisonBar({
  label,
  value,
  width,
  tone,
  emphasized,
}: {
  label: string;
  value: number;
  width: string;
  tone: "stone" | "future";
  emphasized?: boolean;
}) {
  const barClass =
    tone === "future" ? brand.compareBarFuture : brand.compareBarPast;
  return (
    <div>
      <div className="flex justify-between text-xs text-stone-600">
        <span>{label}</span>
        <span className="font-medium tabular-nums text-stone-800">
          {value.toLocaleString("fi-FI")} kWh/v
        </span>
      </div>
      <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-white/80">
        <div className={`h-full rounded-full ${barClass}`} style={{ width }} />
      </div>
    </div>
  );
}
