"use client";

import { useEffect, useState, useTransition } from "react";
import {
  ackAirfiAlarms,
  setFanSpeedLevel,
  setFireplaceBypass,
  setSaunaMode,
  setTempSetpoint,
  type ActionState,
} from "@/app/actions/hubs";
import { CommandStatusPanel } from "@/components/command-status-panel";
import { useCommandStatus } from "@/hooks/use-command-status";
import { useDeviceStatus } from "@/hooks/use-device-status";
import { PING_INTERVAL_MS } from "@/lib/device-status";
import { decodeAirfiErrors, AIRFI_ERROR_BITS } from "@/lib/airfi-errors";
import type { Hub, HubState } from "@/lib/types";
import type { DeviceStatus } from "@/lib/device-status";

type Props = {
  hub: Hub;
};

function pickAirfiState(
  hubState: HubState,
  live?: DeviceStatus["live"],
): HubState {
  if (!live) return hubState;
  return {
    ...hubState,
    outdoor_temp_c: live.outdoor_temp_c ?? hubState.outdoor_temp_c,
    exhaust_temp_c: live.exhaust_temp_c ?? hubState.exhaust_temp_c,
    supply_room_temp_c: live.supply_room_temp_c ?? hubState.supply_room_temp_c,
    fan_speed_level: live.fan_speed_level ?? hubState.fan_speed_level,
    temp_setpoint_c: live.temp_setpoint_c ?? hubState.temp_setpoint_c,
    filter_change_per_year:
      live.filter_change_per_year ?? hubState.filter_change_per_year,
    sauna_mode: live.sauna_mode ?? hubState.sauna_mode,
    fireplace_active: live.fireplace_active ?? hubState.fireplace_active,
    emergency_stop: live.emergency_stop ?? hubState.emergency_stop,
    freezing_alarm: live.freezing_alarm ?? hubState.freezing_alarm,
    machine_fault: live.machine_fault ?? hubState.machine_fault,
    airfi_error_raw: live.airfi_error_raw ?? hubState.airfi_error_raw,
    airfi_errors: live.airfi_errors ?? hubState.airfi_errors,
  };
}

function formatFilterInterval(value: number | null | undefined): string {
  if (value == null || value <= 0) return "Ei asetettu";
  return `${value}× / vuosi`;
}

function formatTemp(value: number | null | undefined): string {
  if (value == null) return "—";
  return `${value.toFixed(1)} °C`;
}

export function AirfiSettingsPanel({ hub }: Props) {
  const [pending, startTransition] = useTransition();
  const [flash, setFlash] = useState<ActionState | null>(null);
  const [trackIds, setTrackIds] = useState<string[]>([]);
  const { commands: activeCommands, refresh: refreshCommands } =
    useCommandStatus(trackIds.length > 0 ? trackIds : undefined);
  const { status } = useDeviceStatus(
    activeCommands.length > 0 ? 2_000 : PING_INTERVAL_MS,
  );

  const state = pickAirfiState(hub.state, status?.live);
  const errorRaw = state.airfi_error_raw ?? 0;
  const errors =
    errorRaw > 0
      ? decodeAirfiErrors(errorRaw)
      : (state.airfi_errors ?? []).map((code) => {
          const bit = AIRFI_ERROR_BITS.find((b) => b.code === code);
          return { code, label: bit?.label ?? code };
        });

  const hasCritical = state.machine_fault === true;
  const hasWarning =
    state.emergency_stop === true ||
    state.freezing_alarm === true ||
    errors.length > 0;
  const needsAck = hasCritical || hasWarning;

  const [tempSetpoint, setTempSetpointLocal] = useState(
    state.temp_setpoint_c ?? 21,
  );
  const [speedLevel, setSpeedLevelLocal] = useState(
    state.fan_speed_level ?? 2,
  );
  const [bypass, setBypass] = useState(state.fireplace_active ?? false);
  const [sauna, setSauna] = useState(state.sauna_mode ?? false);

  useEffect(() => {
    if (state.temp_setpoint_c != null) setTempSetpointLocal(state.temp_setpoint_c);
  }, [state.temp_setpoint_c]);

  useEffect(() => {
    if (state.fan_speed_level != null) setSpeedLevelLocal(state.fan_speed_level);
  }, [state.fan_speed_level]);

  useEffect(() => {
    setBypass(state.fireplace_active ?? false);
  }, [state.fireplace_active]);

  useEffect(() => {
    setSauna(state.sauna_mode ?? false);
  }, [state.sauna_mode]);

  function run(action: () => Promise<ActionState>) {
    if (pending) return;
    startTransition(async () => {
      const result = await action();
      setFlash(result);
      if (result.commandIds?.length) {
        setTrackIds((prev) => [...result.commandIds!, ...prev].slice(0, 6));
        void refreshCommands();
      }
    });
  }

  const bannerClass = hasCritical
    ? "border-red-300 bg-red-50 text-red-950"
    : "border-amber-300 bg-amber-50 text-amber-950";

  return (
    <section className="space-y-6">
      {flash && (
        <div
          role="status"
          className={`rounded-xl border px-4 py-3 text-sm ${
            flash.error
              ? "border-red-200 bg-red-50 text-red-950"
              : "border-emerald-200 bg-emerald-50 text-emerald-950"
          }`}
        >
          {flash.error ?? flash.ok}
        </div>
      )}

      {needsAck && (
        <div
          role="alert"
          className={`rounded-xl border px-4 py-4 text-sm ${bannerClass}`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold">
                {hasCritical ? "Koneen vikatila" : "AirFi-hälytys"}
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {state.emergency_stop && <li>Hätäseis aktiivinen</li>}
                {state.freezing_alarm && <li>Jäätymisvaara</li>}
                {state.machine_fault && <li>Koneen vikatila aktiivinen</li>}
                {errors.map((err) => (
                  <li key={err.code}>
                    {err.code}: {err.label}
                    {err.code === "E1" && (
                      <span className="block text-xs font-normal opacity-90">
                        Ulkopuolinen pysäytys — kuittaa. Älykoti ei ohjaa tuuletusta hätäseis-tilassa.
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => ackAirfiAlarms(hub.id))}
              className="shrink-0 rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-50"
            >
              Kuittaa hälytys
            </button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-stone-900">Ilmanvaihtokoneen tila</h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <StatusItem label="Ulkoilma" value={formatTemp(state.outdoor_temp_c)} />
          <StatusItem label="Poisto" value={formatTemp(state.exhaust_temp_c)} />
          <StatusItem label="Tulo huoneeseen" value={formatTemp(state.supply_room_temp_c)} />
          <StatusItem
            label="Lämpötila-asetus"
            value={formatTemp(state.temp_setpoint_c)}
          />
          <StatusItem
            label="Nopeustaso"
            value={
              state.fan_speed_level != null ? String(state.fan_speed_level) : "—"
            }
          />
          <StatusItem
            label="Suodatinväli"
            value={formatFilterInterval(state.filter_change_per_year)}
          />
        </dl>
      </div>

      <CommandStatusPanel commands={activeCommands} />

      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-stone-900">Koneen asetukset</h2>
        <p className="mt-1 text-sm text-stone-600">
          Muutokset lähetetään AirFiin keskusyksikön kautta.
        </p>

        <div className="mt-5 space-y-6">
          <SettingSlider
            label="Lämpötila-asetus"
            value={tempSetpoint}
            onChange={setTempSetpointLocal}
            min={5}
            max={26}
            step={0.5}
            format={(v) => `${v.toFixed(1)} °C`}
            disabled={pending}
          />
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              run(() => setTempSetpoint(hub.id, tempSetpoint))
            }
            className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-50"
          >
            Tallenna lämpötila
          </button>

          <SettingSlider
            label="Nopeustaso"
            value={speedLevel}
            onChange={setSpeedLevelLocal}
            min={0}
            max={5}
            step={1}
            format={(v) => String(v)}
            disabled={pending}
          />
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              run(() => setFanSpeedLevel(hub.id, speedLevel))
            }
            className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold hover:bg-stone-50 disabled:opacity-50"
          >
            Tallenna nopeustaso
          </button>

          <div className="border-t border-stone-100 pt-5 space-y-4">
            <ToggleRow
              label="Ohitus (takka / painetasaus)"
              description="Aktivoi takka- tai painetasausohitus koneella."
              checked={bypass}
              disabled={pending}
              onChange={(next) => {
                setBypass(next);
                run(() => setFireplaceBypass(hub.id, next));
              }}
            />
            <ToggleRow
              label="Saunatila"
              description="Ilmanvaihdon saunatilan ohjaus."
              checked={sauna}
              disabled={pending}
              onChange={(next) => {
                setSauna(next);
                run(() => setSaunaMode(hub.id, next));
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function StatusItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-stone-500">{label}</dt>
      <dd className="font-medium text-stone-900">{value}</dd>
    </div>
  );
}

function SettingSlider({
  label,
  value,
  onChange,
  min,
  max,
  step,
  format,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  disabled?: boolean;
}) {
  return (
    <label className={`block ${disabled ? "opacity-60" : ""}`}>
      <div className="mb-2 flex items-baseline justify-between text-sm">
        <span className="font-medium text-stone-700">{label}</span>
        <span className="tabular-nums font-semibold text-stone-900">
          {format(value)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-stone-900"
      />
    </label>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-stone-900">{label}</p>
        <p className="text-xs text-stone-500">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
          checked ? "bg-stone-900" : "bg-stone-300"
        }`}
      >
        <span
          className={`absolute top-0.5 size-6 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}
