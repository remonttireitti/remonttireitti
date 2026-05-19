"use client";

import { CLIMATE_ZONE_OPTIONS } from "@/constants/climate-zones";
import type { ClimateZone } from "@/constants/climate-zones";

const inputClass =
  "mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-sky-600 focus:outline-none focus:ring-1 focus:ring-sky-600";

export function ClimateZoneField({
  value,
  onChange,
}: {
  value: ClimateZone;
  onChange: (z: ClimateZone) => void;
}) {
  return (
    <label className="block text-sm">
      Ilmastovyöhyke (lämmitysasteet) *
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as ClimateZone)}
        className={inputClass}
      >
        {CLIMATE_ZONE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <span className="mt-1 block text-xs text-stone-500">
        Vaikuttaa teho- ja energia-arvioon. Valitse vyöhyke, jossa kohde sijaitsee.
      </span>
    </label>
  );
}
