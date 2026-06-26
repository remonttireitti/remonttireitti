import type { EnergyPhases } from "@/lib/types";

const PHASES = ["a", "b", "c"] as const;

export type MeterLivePower = {
  power_kw?: number | null;
  power_w?: number | null;
  phases?: EnergyPhases;
};

/** Reaaliaikainen teho W — käyttää kokonaistehoa tai summaa L1–L3. */
export function meterLivePowerW(live: MeterLivePower): number | null {
  const kw = meterLivePowerKw(live);
  return kw != null ? kw * 1000 : null;
}

export function meterLivePowerKw(live: MeterLivePower): number | null {
  if (live.power_kw != null && Number.isFinite(live.power_kw)) return live.power_kw;
  if (live.power_w != null && Number.isFinite(live.power_w)) return live.power_w / 1000;

  const phases = live.phases ?? {};
  let sum = 0;
  let any = false;
  for (const key of PHASES) {
    const p = phases[key];
    if (!p) continue;
    const kw =
      p.power_kw != null && Number.isFinite(p.power_kw)
        ? p.power_kw
        : p.power_w != null && Number.isFinite(p.power_w)
          ? p.power_w / 1000
          : null;
    if (kw != null) {
      sum += kw;
      any = true;
    }
  }
  return any ? sum : null;
}
