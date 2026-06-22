"use client";

import { useDeviceStatus } from "@/hooks/use-device-status";
import { decodeAirfiErrors, AIRFI_ERROR_BITS } from "@/lib/airfi-errors";
import type { Hub, HubState } from "@/lib/types";
import type { DeviceStatus } from "@/lib/device-status";

type Props = {
  hub: Hub;
};

function pickAirfiStatus(
  hubState: HubState,
  live?: DeviceStatus["live"],
): HubState {
  if (!live) return hubState;
  return {
    ...hubState,
    fan_speed_level: live.fan_speed_level ?? hubState.fan_speed_level,
    temp_setpoint_c: live.temp_setpoint_c ?? hubState.temp_setpoint_c,
    filter_change_per_year:
      live.filter_change_per_year ?? hubState.filter_change_per_year,
    sauna_mode: live.sauna_mode ?? hubState.sauna_mode,
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

export function AirfiStatusPanel({ hub }: Props) {
  const { status } = useDeviceStatus();
  const state = pickAirfiStatus(hub.state, status?.live);

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
  const showBanner = hasCritical || hasWarning;

  if (
    !showBanner &&
    state.temp_setpoint_c == null &&
    state.fan_speed_level == null &&
    state.filter_change_per_year == null &&
    state.sauna_mode == null
  ) {
    return null;
  }

  const bannerClass = hasCritical
    ? "border-red-300 bg-red-50 text-red-950"
    : "border-amber-300 bg-amber-50 text-amber-950";

  return (
    <section className="mt-4 space-y-3" aria-label="AirFi-tila">
      {showBanner && (
        <div
          role="alert"
          className={`rounded-xl border px-4 py-3 text-sm ${bannerClass}`}
        >
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
                    Ulkopuolinen pysäytys — kuittaa ja odota ~30 s. Älykoti ei ohjaa tuuletusta
                    hätäseis-tilassa.
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm shadow-sm">
        <p className="font-semibold text-stone-900">Ilmanvaihtokone</p>
        <dl className="mt-2 grid gap-2 sm:grid-cols-2">
          <div>
            <dt className="text-stone-500">Lämpötila-asetus</dt>
            <dd className="font-medium text-stone-900">
              {state.temp_setpoint_c != null
                ? `${state.temp_setpoint_c.toFixed(1)} °C`
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-stone-500">Nopeustaso</dt>
            <dd className="font-medium text-stone-900">
              {state.fan_speed_level != null ? state.fan_speed_level : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-stone-500">Suodatinväli</dt>
            <dd className="font-medium text-stone-900">
              {formatFilterInterval(state.filter_change_per_year)}
            </dd>
          </div>
          <div>
            <dt className="text-stone-500">Saunatila</dt>
            <dd className="font-medium text-stone-900">
              {state.sauna_mode ? "Päällä" : "Pois"}
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
