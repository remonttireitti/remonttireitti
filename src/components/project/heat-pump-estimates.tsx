"use client";

import type { IlpCoolingNeed } from "@/constants/ilmalampopumppu";
import {
  estimateAnnualEnergy,
  estimateCoolingPowerKw,
  estimateHeatingPowerKw,
  type PowerEstimate,
  type PumpSizingVariant,
} from "@/lib/heat-pump-sizing";
import type { ClimateZone } from "@/constants/climate-zones";
import { brand } from "@/lib/brand-theme";
import type { HeatDistribution } from "@/types/heating-system-details";

type Props = {
  variant: PumpSizingVariant;
  heatedAreaM2: number;
  climateZone: ClimateZone;
  buildYear: number | null;
  heatDistribution?: HeatDistribution[];
  householdSize?: number;
  showAnnualEnergy?: boolean;
  /** Ilmalämpöpumpun käyttötarkoitus */
  usage?: "cooling_only" | "heating_and_cooling";
  coolingNeed?: IlpCoolingNeed;
};

function EstimateBlock({ power }: { power: PowerEstimate }) {
  return (
    <div className="space-y-1.5">
      <p>
        <span className="font-medium text-sky-800">{power.headline}: </span>
        n. {power.kwMin}–{power.kwMax} kW (tyypillisesti n. {power.kwTypical}{" "}
        kW)
      </p>
      <p className="text-xs text-sky-800/90">{power.breakdown}</p>
      <p className="text-xs text-stone-600">{power.note}</p>
    </div>
  );
}

export function HeatPumpEstimates({
  variant,
  heatedAreaM2,
  climateZone,
  buildYear,
  heatDistribution,
  householdSize,
  showAnnualEnergy = false,
  usage,
  coolingNeed = "normal",
}: Props) {
  if (heatedAreaM2 < 10) return null;

  const sizingInput = {
    heatedAreaM2,
    climateZone,
    buildYear,
    variant,
    heatDistribution,
  };

  const isAir = variant === "air";
  const coolingOnly = isAir && usage === "cooling_only";
  const heatingAndCooling = isAir && usage === "heating_and_cooling";

  const heating =
    !coolingOnly ? estimateHeatingPowerKw(sizingInput) : null;
  const cooling =
    isAir && (coolingOnly || heatingAndCooling)
      ? estimateCoolingPowerKw(heatedAreaM2, coolingNeed, climateZone)
      : null;

  const energy =
    showAnnualEnergy && !coolingOnly
      ? estimateAnnualEnergy({ ...sizingInput, householdSize })
      : null;

  if (!heating && !cooling) return null;

  return (
    <div className={`space-y-3 ${brand.estimateBox}`} role="status">
      <p className="font-medium text-sky-950">Suuntaa-antava arvio</p>

      {coolingOnly && cooling && <EstimateBlock power={cooling} />}

      {heatingAndCooling && (
        <>
          {heating && <EstimateBlock power={heating} />}
          {cooling && <EstimateBlock power={cooling} />}
        </>
      )}

      {!isAir && heating && <EstimateBlock power={heating} />}

      {energy && (
        <p>
          <span className="font-medium text-orange-700">Sähköenergia arvio: </span>
          n. {energy.electricKwhMin.toLocaleString("fi-FI")}–
          {energy.electricKwhMax.toLocaleString("fi-FI")} kWh/v (tyypillisesti
          n. {energy.electricKwhTypical.toLocaleString("fi-FI")} kWh/v, COP n.{" "}
          {energy.copAssumed})
        </p>
      )}
    </div>
  );
}
