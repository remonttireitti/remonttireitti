"use client";

import { useState, useTransition } from "react";
import { saveVentilationConfig } from "@/app/actions/hubs";
import type { VentilationConfig } from "@/lib/types";
import { formatNightWindow, isNightMode, MIN_FAN_PCT } from "@/lib/ventilation-logic";

type Props = {
  hubId: string;
  config: VentilationConfig;
};

export function AutomationSettingsForm({ hubId, config }: Props) {
  const [values, setValues] = useState(config);
  const [flash, setFlash] = useState<{ error?: string; ok?: string }>({});
  const [pending, startTransition] = useTransition();
  const nightActive = isNightMode(values);

  function patch(partial: Partial<VentilationConfig>) {
    setValues((prev) => ({ ...prev, ...partial }));
  }

  function setCo2(
    field: "co2_normal_max" | "co2_elevated_max" | "co2_high_max",
    raw: number,
  ) {
    setValues((prev) => {
      const next = { ...prev, [field]: raw };
      if (next.co2_normal_max >= next.co2_elevated_max) {
        next.co2_elevated_max = Math.min(5000, next.co2_normal_max + 50);
      }
      if (next.co2_elevated_max >= next.co2_high_max) {
        next.co2_high_max = Math.min(5000, next.co2_elevated_max + 50);
      }
      return next;
    });
  }

  function save() {
    startTransition(async () => {
      const result = await saveVentilationConfig(hubId, values);
      setFlash(result);
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
    >
      <h2 className="text-lg font-semibold text-stone-900">Automaatioasetukset</h2>
      <p className="mt-1 text-sm text-stone-600">
        Liukuva CO₂-ohjaus 25–100 %. Miniminopeus on aina 25 %.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <fieldset className="space-y-5">
          <legend className="text-sm font-semibold text-stone-800">CO₂-rajat (ppm)</legend>
          <ConfigSlider
            label="Normaali alle"
            value={values.co2_normal_max}
            onChange={(v) => setCo2("co2_normal_max", v)}
            min={400}
            max={4500}
            step={50}
            unit=" ppm"
          />
          <ConfigSlider
            label="Kohonnut alle"
            value={values.co2_elevated_max}
            onChange={(v) => setCo2("co2_elevated_max", v)}
            min={450}
            max={4800}
            step={50}
            unit=" ppm"
          />
          <ConfigSlider
            label="Korkea alle"
            value={values.co2_high_max}
            onChange={(v) => setCo2("co2_high_max", v)}
            min={500}
            max={5000}
            step={50}
            unit=" ppm"
          />
        </fieldset>

        <fieldset className="space-y-5">
          <legend className="text-sm font-semibold text-stone-800">Automaatti % (liukuva)</legend>
          <PctSlider
            label="Normaali taso"
            value={values.speed_normal_pct}
            onChange={(v) => patch({ speed_normal_pct: v })}
          />
          <PctSlider
            label="Kohonnut taso"
            value={values.speed_elevated_pct}
            onChange={(v) => patch({ speed_elevated_pct: v })}
          />
          <PctSlider
            label="Korkea taso"
            value={values.speed_high_pct}
            onChange={(v) => patch({ speed_high_pct: v })}
          />
          <PctSlider
            label="Yli rajan"
            value={values.speed_max_pct}
            onChange={(v) => patch({ speed_max_pct: v })}
          />
        </fieldset>
      </div>

      <fieldset className="mt-6 rounded-xl border border-stone-100 bg-stone-50 p-4">
        <legend className="px-1 text-sm font-semibold text-stone-800">Yöaika</legend>
        <div className="mt-3 flex items-center justify-between gap-4">
          <span className="text-sm font-medium text-stone-700">Rajoita tuuletusta yöllä</span>
          <ToggleSwitch
            checked={values.night_enabled}
            onChange={(night_enabled) => patch({ night_enabled })}
            label="Rajoita tuuletusta yöllä"
          />
        </div>
        <div
          className={`mt-4 grid gap-5 sm:grid-cols-3 ${values.night_enabled ? "" : "opacity-50"}`}
        >
          <ConfigSlider
            label="Alkaa"
            value={values.night_start_hour}
            onChange={(v) => patch({ night_start_hour: v })}
            min={0}
            max={23}
            step={1}
            unit=":00"
            format={(v) => `${v}:00`}
            disabled={!values.night_enabled}
          />
          <ConfigSlider
            label="Päättyy"
            value={values.night_end_hour}
            onChange={(v) => patch({ night_end_hour: v })}
            min={0}
            max={23}
            step={1}
            unit=":00"
            format={(v) => `${v}:00`}
            disabled={!values.night_enabled}
          />
          <PctSlider
            label="Yön max %"
            value={values.night_max_pct}
            onChange={(v) => patch({ night_max_pct: v })}
            disabled={!values.night_enabled}
          />
        </div>
        <p className="mt-2 text-xs text-stone-500">
          {formatNightWindow(values)}
          {nightActive ? " — yötila aktiivinen nyt." : ""}
        </p>
      </fieldset>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <fieldset className="space-y-5 rounded-xl border border-amber-100 bg-amber-50/50 p-4">
          <legend className="text-sm font-semibold text-amber-950">Takkatila (y-lipas)</legend>
          <p className="text-xs text-amber-900">Tulo kovempaa → ylipaine taloon.</p>
          <PctSlider
            label="Tulo %"
            value={values.fireplace_supply_pct}
            onChange={(v) => patch({ fireplace_supply_pct: v })}
          />
          <PctSlider
            label="Poisto %"
            value={values.fireplace_exhaust_pct}
            onChange={(v) => patch({ fireplace_exhaust_pct: v })}
          />
        </fieldset>

        <fieldset className="space-y-5 rounded-xl border border-sky-100 bg-sky-50/50 p-4">
          <legend className="text-sm font-semibold text-sky-950">Liesituuletin</legend>
          <p className="text-xs text-sky-900">Ohittaa automaation kokonaan.</p>
          <PctSlider
            label="Tulo %"
            value={values.hood_supply_pct}
            onChange={(v) => patch({ hood_supply_pct: v })}
          />
          <PctSlider
            label="Poisto %"
            value={values.hood_exhaust_pct}
            onChange={(v) => patch({ hood_exhaust_pct: v })}
          />
        </fieldset>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="mt-6 rounded-xl bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-60"
      >
        {pending ? "Tallennetaan…" : "Tallenna asetukset"}
      </button>

      {flash.error && (
        <p className="mt-3 text-sm text-red-700" role="alert">
          {flash.error}
        </p>
      )}
      {flash.ok && (
        <p className="mt-3 text-sm text-emerald-700" role="status">
          {flash.ok}
        </p>
      )}
    </form>
  );
}

function ConfigSlider({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit = "",
  format,
  disabled = false,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  format?: (v: number) => string;
  disabled?: boolean;
}) {
  const display = format ? format(value) : `${value}${unit}`;

  return (
    <label className={`block ${disabled ? "pointer-events-none" : ""}`}>
      <div className="mb-2 flex items-baseline justify-between text-sm">
        <span className="font-medium text-stone-700">{label}</span>
        <span className="tabular-nums font-semibold text-stone-900">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-stone-200 accent-stone-900 disabled:cursor-not-allowed"
      />
    </label>
  );
}

function PctSlider({
  label,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <ConfigSlider
      label={label}
      value={value}
      onChange={onChange}
      min={MIN_FAN_PCT}
      max={100}
      step={1}
      unit=" %"
      disabled={disabled}
    />
  );
}

function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
        checked ? "bg-stone-900" : "bg-stone-300"
      }`}
    >
      <span
        className={`absolute top-0.5 size-6 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
