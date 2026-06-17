"use client";

import { useActionState } from "react";
import { saveVentilationConfig } from "@/app/actions/hubs";
import type { VentilationConfig } from "@/lib/types";
import { formatNightWindow, isNightMode } from "@/lib/ventilation-logic";

type Props = {
  hubId: string;
  config: VentilationConfig;
};

const initial = { error: "", ok: "" };

export function AutomationSettingsForm({ hubId, config }: Props) {
  const nightActive = isNightMode(config);
  const [state, submit, pending] = useActionState(
    async (_prev: typeof initial, formData: FormData) => {
      const next: VentilationConfig = {
        co2_normal_max: Number(formData.get("co2_normal_max")),
        co2_elevated_max: Number(formData.get("co2_elevated_max")),
        co2_high_max: Number(formData.get("co2_high_max")),
        speed_normal_pct: Number(formData.get("speed_normal_pct")),
        speed_elevated_pct: Number(formData.get("speed_elevated_pct")),
        speed_high_pct: Number(formData.get("speed_high_pct")),
        speed_max_pct: Number(formData.get("speed_max_pct")),
        night_enabled: formData.get("night_enabled") === "on",
        night_start_hour: Number(formData.get("night_start_hour")),
        night_end_hour: Number(formData.get("night_end_hour")),
        night_max_pct: Number(formData.get("night_max_pct")),
        fireplace_supply_pct: Number(formData.get("fireplace_supply_pct")),
        fireplace_exhaust_pct: Number(formData.get("fireplace_exhaust_pct")),
        hood_supply_pct: Number(formData.get("hood_supply_pct")),
        hood_exhaust_pct: Number(formData.get("hood_exhaust_pct")),
      };
      const result = await saveVentilationConfig(hubId, next);
      return { error: result.error ?? "", ok: result.ok ?? "" };
    },
    initial,
  );

  return (
    <form action={submit} className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-stone-900">Automaatioasetukset</h2>
      <p className="mt-1 text-sm text-stone-600">
        Liukuva CO₂-ohjaus 25–100 %. Miniminopeus on aina 25 %.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-stone-800">CO₂-rajat (ppm)</legend>
          <NumberField label="Normaali alle" name="co2_normal_max" defaultValue={config.co2_normal_max} />
          <NumberField label="Kohonnut alle" name="co2_elevated_max" defaultValue={config.co2_elevated_max} />
          <NumberField label="Korkea alle" name="co2_high_max" defaultValue={config.co2_high_max} />
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-stone-800">Automaatti % (liukuva)</legend>
          <PctField label="Normaali taso" name="speed_normal_pct" defaultValue={config.speed_normal_pct} />
          <PctField label="Kohonnut taso" name="speed_elevated_pct" defaultValue={config.speed_elevated_pct} />
          <PctField label="Korkea taso" name="speed_high_pct" defaultValue={config.speed_high_pct} />
          <PctField label="Yli rajan" name="speed_max_pct" defaultValue={config.speed_max_pct} />
        </fieldset>
      </div>

      <fieldset className="mt-6 rounded-xl border border-stone-100 bg-stone-50 p-4">
        <legend className="px-1 text-sm font-semibold text-stone-800">Yöaika</legend>
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="night_enabled"
            defaultChecked={config.night_enabled}
            className="size-4 rounded border-stone-300"
          />
          <span>Rajoita tuuletusta yöllä</span>
        </label>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <HourField label="Alkaa" name="night_start_hour" defaultValue={config.night_start_hour} />
          <HourField label="Päättyy" name="night_end_hour" defaultValue={config.night_end_hour} />
          <PctField label="Yön max %" name="night_max_pct" defaultValue={config.night_max_pct} />
        </div>
        <p className="mt-2 text-xs text-stone-500">
          {formatNightWindow(config)}
          {nightActive ? " — yötila aktiivinen nyt." : ""}
        </p>
      </fieldset>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <fieldset className="space-y-3 rounded-xl border border-amber-100 bg-amber-50/50 p-4">
          <legend className="text-sm font-semibold text-amber-950">Takkatila (y lipas)</legend>
          <p className="text-xs text-amber-900">Tulo kovempaa → ylipaine taloon.</p>
          <PctField label="Tulo %" name="fireplace_supply_pct" defaultValue={config.fireplace_supply_pct} />
          <PctField label="Poisto %" name="fireplace_exhaust_pct" defaultValue={config.fireplace_exhaust_pct} />
        </fieldset>

        <fieldset className="space-y-3 rounded-xl border border-sky-100 bg-sky-50/50 p-4">
          <legend className="text-sm font-semibold text-sky-950">Liesituuletin</legend>
          <p className="text-xs text-sky-900">Ohittaa automaation kokonaan.</p>
          <PctField label="Tulo %" name="hood_supply_pct" defaultValue={config.hood_supply_pct} />
          <PctField label="Poisto %" name="hood_exhaust_pct" defaultValue={config.hood_exhaust_pct} />
        </fieldset>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="mt-6 rounded-xl bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-60"
      >
        {pending ? "Tallennetaan…" : "Tallenna asetukset"}
      </button>

      {state.error && <p className="mt-3 text-sm text-red-700" role="alert">{state.error}</p>}
      {state.ok && <p className="mt-3 text-sm text-emerald-700" role="status">{state.ok}</p>}
    </form>
  );
}

function NumberField({
  label,
  name,
  defaultValue,
  min = 400,
  max = 5000,
}: {
  label: string;
  name: string;
  defaultValue: number;
  min?: number;
  max?: number;
}) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-stone-700">{label}</span>
      <input
        type="number"
        name={name}
        defaultValue={defaultValue}
        min={min}
        max={max}
        required
        className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2"
      />
    </label>
  );
}

function PctField({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue: number;
}) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-stone-700">{label}</span>
      <input
        type="number"
        name={name}
        defaultValue={defaultValue}
        min={25}
        max={100}
        required
        className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2"
      />
    </label>
  );
}

function HourField({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue: number;
}) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-stone-700">{label}</span>
      <input
        type="number"
        name={name}
        defaultValue={defaultValue}
        min={0}
        max={23}
        required
        className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2"
      />
    </label>
  );
}
