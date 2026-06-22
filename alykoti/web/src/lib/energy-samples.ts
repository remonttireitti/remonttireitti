import { createAdminClient } from "@/lib/supabase/admin";
import { hasCapability } from "@/lib/capabilities";
import type { HubHomeDevice } from "@/lib/types";

export const ENERGY_RETENTION_DAYS = 90;
const HELSINKI = "Europe/Helsinki";
const ENERGY_METRIC_PREFIX = "energy_wh:";

export type EnergySamplePoint = {
  t: string;
  wh: number;
};

export type DailyEnergy = {
  date: string;
  label: string;
  kwh: number | null;
};

export function energyMetricKey(deviceId: string): string {
  return `${ENERGY_METRIC_PREFIX}${deviceId}`;
}

export function isEmMeter(id: string, device: HubHomeDevice): boolean {
  if (id.endsWith(":em")) return true;
  if (hasCapability(device.capabilities, "energy") || hasCapability(device.capabilities, "meter")) {
    return true;
  }
  if (device.protocol !== "shelly") return false;
  return (
    device.kind === "sensor" &&
    (device.energy_wh != null ||
      device.em_phases != null ||
      device.power_w != null ||
      device.power_kw != null)
  );
}

export function findEmMeters(
  home: Record<string, HubHomeDevice> | undefined,
): Array<{ id: string; device: HubHomeDevice }> {
  if (!home) return [];
  return Object.entries(home)
    .filter(([id, d]) => isEmMeter(id, d))
    .map(([id, device]) => ({ id, device }))
    .sort((a, b) => a.device.name.localeCompare(b.device.name, "fi"));
}

function num(v: number | null | undefined): number | null {
  if (v == null || !Number.isFinite(v)) return null;
  return v;
}

export function helsinkiDateKey(iso: string): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: HELSINKI,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function dayLabel(dateKey: string): string {
  const today = helsinkiDateKey(new Date().toISOString());
  const yesterday = helsinkiDateKey(new Date(Date.now() - 86_400_000).toISOString());
  if (dateKey === today) return "Tänään";
  if (dateKey === yesterday) return "Eilen";
  const [y, m, day] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, day).toLocaleDateString("fi-FI", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/** Kulutus kWh päivän Wh-laskurin deltoista (Europe/Helsinki). */
export function computeDailyKwh(
  samples: EnergySamplePoint[],
  days: number,
  liveWh?: number | null,
): DailyEnergy[] {
  const todayKey = helsinkiDateKey(new Date().toISOString());
  const dayKeys: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dayKeys.push(helsinkiDateKey(d.toISOString()));
  }

  const byDay = new Map<string, { min: number; max: number }>();
  for (const key of dayKeys) {
    byDay.set(key, { min: Infinity, max: -Infinity });
  }

  for (const pt of samples) {
    const key = helsinkiDateKey(pt.t);
    if (!byDay.has(key)) continue;
    const row = byDay.get(key)!;
    row.min = Math.min(row.min, pt.wh);
    row.max = Math.max(row.max, pt.wh);
  }

  if (liveWh != null && Number.isFinite(liveWh) && byDay.has(todayKey)) {
    const row = byDay.get(todayKey)!;
    row.min = Math.min(row.min, liveWh);
    row.max = Math.max(row.max, liveWh);
  }

  return dayKeys.map((date) => {
    const row = byDay.get(date)!;
    if (!Number.isFinite(row.min) || !Number.isFinite(row.max)) {
      return { date, label: dayLabel(date), kwh: null };
    }
    const delta = row.max - row.min;
    const kwh = delta >= 0 ? delta / 1000 : null;
    return { date, label: dayLabel(date), kwh };
  });
}

export function consumptionTodayKwh(
  samples: EnergySamplePoint[],
  liveWh?: number | null,
): number | null {
  const daily = computeDailyKwh(samples, 1, liveWh);
  return daily[0]?.kwh ?? null;
}

export async function recordEnergySamples(
  hubId: string,
  homeDevices: Record<string, HubHomeDevice> | undefined,
): Promise<void> {
  const meters = findEmMeters(homeDevices);
  if (meters.length === 0) return;

  const payload = meters
    .map(({ id, device }) => {
      const wh = num(device.energy_wh);
      if (wh == null) return null;
      return {
        hub_id: hubId,
        metric: energyMetricKey(id),
        value: wh,
        value_text: null,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row != null);

  if (payload.length === 0) return;

  const supabase = createAdminClient();
  const { error } = await supabase.from("hub_metric_samples").insert(payload);
  if (error) {
    console.warn("[energy] Tallennus epäonnistui:", error.message ?? String(error));
    return;
  }

  const cutoff = new Date(Date.now() - ENERGY_RETENTION_DAYS * 86_400_000).toISOString();
  await supabase
    .from("hub_metric_samples")
    .delete()
    .eq("hub_id", hubId)
    .like("metric", `${ENERGY_METRIC_PREFIX}%`)
    .lt("recorded_at", cutoff);
}

export async function fetchEnergySamples(
  hubId: string,
  deviceId: string,
  since: Date,
): Promise<EnergySamplePoint[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("hub_metric_samples")
    .select("value, recorded_at")
    .eq("hub_id", hubId)
    .eq("metric", energyMetricKey(deviceId))
    .gte("recorded_at", since.toISOString())
    .order("recorded_at", { ascending: true })
    .limit(5000);

  if (error) {
    console.warn("[energy] Haku epäonnistui:", error.message);
    return [];
  }

  return (data ?? [])
    .map((row) => ({
      t: String(row.recorded_at),
      wh: Number(row.value),
    }))
    .filter((pt) => Number.isFinite(pt.wh));
}
