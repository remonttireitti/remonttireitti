import { meterLivePowerKw } from "@/lib/energy-live";
import type { EnergyPhases, HubHomeDevice } from "@/lib/types";

export type EmMeterLive = {
  power_w: number | null;
  power_kw: number | null;
  energy_wh: number | null;
  phases: EnergyPhases;
};

export function buildEmMeterLive(device: HubHomeDevice): EmMeterLive {
  const powerW = device.power_w ?? null;
  const powerKw =
    device.power_kw ??
    (powerW != null && Number.isFinite(powerW) ? powerW / 1000 : null);
  const phases = device.em_phases ?? {};

  const live: EmMeterLive = {
    power_w: powerW,
    power_kw: powerKw,
    energy_wh: device.energy_wh ?? null,
    phases,
  };
  const resolvedKw = meterLivePowerKw(live);
  if (resolvedKw != null) {
    live.power_kw = resolvedKw;
    live.power_w = resolvedKw * 1000;
  }
  return live;
}
