"use client";

import {
  dhwSystemLabel,
  estimateDhwThermalKwhPerYear,
  providesDomesticHotWater,
  recommendedDhwTankLiters,
} from "@/lib/domestic-hot-water";
import type { PumpSizingVariant } from "@/lib/heat-pump-sizing";

type Props = {
  householdSize: number;
  variant: PumpSizingVariant;
};

export function DhwRecommendation({ householdSize, variant }: Props) {
  if (!providesDomesticHotWater(variant)) return null;

  const kwh = estimateDhwThermalKwhPerYear(householdSize);
  const liters = recommendedDhwTankLiters(householdSize);
  const system = dhwSystemLabel(variant);

  return (
    <div className="rounded-lg border border-orange-200 bg-gradient-to-r from-sky-50/90 to-orange-50/60 px-3 py-3 text-sm text-sky-950">
      <p className="font-medium">Käyttövesi</p>
      <p className="mt-1 text-xs leading-relaxed text-sky-900/90">
        Jatkossa käyttövesi lämmitetään {system}lla ja lämpimässä
        vesivarajassa. Varaaja mitataan asukasluvun mukaan.
      </p>
      <ul className="mt-2 space-y-1 text-xs text-sky-900">
        <li>
          Arvioitu käyttövesienergia: n. {kwh.toLocaleString("fi-FI")} kWh/v (
          {householdSize} henkilöä)
        </li>
        <li>Suositeltu varaajan tilavuus: n. {liters} l</li>
      </ul>
    </div>
  );
}
