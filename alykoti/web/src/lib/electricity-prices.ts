/** Nord Pool -porssihinnat Suomelle (spot-hinta.fi, sama data kuin HA-integraatioissa). */

export const ELECTRICITY_PRICE_REGION = "FI" as const;
export const SPOT_HINTA_BASE = "https://api.spot-hinta.fi";

export type ElectricityPriceRegion = typeof ELECTRICITY_PRICE_REGION;

export type SpotPriceSlot = {
  at: string;
  rank: number;
  /** ALV:n kanssa, senttia / kWh */
  centsPerKwh: number;
};

export type ElectricityPriceDay = {
  date: string;
  label: string;
  minCents: number;
  maxCents: number;
  avgCents: number;
  hours: SpotPriceSlot[];
};

export type ElectricityPrices = {
  region: ElectricityPriceRegion;
  source: "spot-hinta.fi";
  updatedAt: string;
  slots: SpotPriceSlot[];
  hours: SpotPriceSlot[];
  today: ElectricityPriceDay;
  tomorrow: ElectricityPriceDay | null;
  current: SpotPriceSlot | null;
  next: SpotPriceSlot | null;
};

type RawSpotRow = {
  Rank: number;
  DateTime: string;
  PriceNoTax: number;
  PriceWithTax: number;
};

const HELSINKI = "Europe/Helsinki";

export function eurToCents(eurPerKwh: number): number {
  return Math.round(eurPerKwh * 100 * 100) / 100;
}

export function formatPriceCents(cents: number | null | undefined): string {
  if (cents == null || !Number.isFinite(cents)) return "—";
  return `${cents.toLocaleString("fi-FI", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} c/kWh`;
}

function helsinkiDateKey(iso: string): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: HELSINKI,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function helsinkiHourKey(iso: string): string {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: HELSINKI,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}`;
}

function dayLabel(dateKey: string): string {
  const today = helsinkiDateKey(new Date().toISOString());
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = helsinkiDateKey(tomorrowDate.toISOString());
  if (dateKey === today) return "Tanaan";
  if (dateKey === tomorrow) return "Huomenna";
  const [y, m, day] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, day).toLocaleDateString("fi-FI", {
    day: "numeric",
    month: "short",
  });
}

function aggregateHourly(slots: SpotPriceSlot[]): SpotPriceSlot[] {
  const buckets = new Map<string, SpotPriceSlot[]>();
  for (const slot of slots) {
    const key = helsinkiHourKey(slot.at);
    const list = buckets.get(key) ?? [];
    list.push(slot);
    buckets.set(key, list);
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, group]) => {
      const cents =
        group.reduce((sum, s) => sum + s.centsPerKwh, 0) / group.length;
      const rank = Math.round(
        group.reduce((sum, s) => sum + s.rank, 0) / group.length,
      );
      return {
        at: group[0]!.at,
        rank,
        centsPerKwh: Math.round(cents * 100) / 100,
      };
    });
}

function summarizeDay(dateKey: string, hours: SpotPriceSlot[]): ElectricityPriceDay {
  const values = hours.map((h) => h.centsPerKwh);
  const minCents = values.length ? Math.min(...values) : 0;
  const maxCents = values.length ? Math.max(...values) : 0;
  const avgCents = values.length
    ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100
    : 0;
  return {
    date: dateKey,
    label: dayLabel(dateKey),
    minCents,
    maxCents,
    avgCents,
    hours,
  };
}

export function findCurrentSlot(
  slots: SpotPriceSlot[],
  now = new Date(),
): SpotPriceSlot | null {
  const t = now.getTime();
  let current: SpotPriceSlot | null = null;
  for (const slot of slots) {
    if (new Date(slot.at).getTime() <= t) current = slot;
    else break;
  }
  return current;
}

export function findNextSlot(
  slots: SpotPriceSlot[],
  now = new Date(),
): SpotPriceSlot | null {
  const t = now.getTime();
  return slots.find((slot) => new Date(slot.at).getTime() > t) ?? null;
}

export function priceBarColor(
  cents: number,
  minCents: number,
  maxCents: number,
): string {
  if (maxCents <= minCents) return "#1a6b5c";
  const t = (cents - minCents) / (maxCents - minCents);
  const r = Math.round(26 + t * (163 - 26));
  const g = Math.round(107 + t * (217 - 107));
  const b = Math.round(92 + t * (119 - 92));
  return `rgb(${r}, ${g}, ${b})`;
}

function parseRows(rows: RawSpotRow[]): SpotPriceSlot[] {
  return rows
    .map((row) => ({
      at: row.DateTime,
      rank: row.Rank,
      centsPerKwh: eurToCents(row.PriceWithTax),
    }))
    .sort((a, b) => a.at.localeCompare(b.at));
}

export function buildElectricityPrices(
  rows: RawSpotRow[],
  region: ElectricityPriceRegion = ELECTRICITY_PRICE_REGION,
): ElectricityPrices {
  const slots = parseRows(rows);
  const hours = aggregateHourly(slots);
  const now = new Date();
  const todayKey = helsinkiDateKey(now.toISOString());

  const tomorrowProbe = new Date(now);
  tomorrowProbe.setDate(tomorrowProbe.getDate() + 1);
  const tomorrowKey = helsinkiDateKey(tomorrowProbe.toISOString());

  const todayHours = hours.filter((h) => helsinkiDateKey(h.at) === todayKey);
  const tomorrowHours = hours.filter((h) => helsinkiDateKey(h.at) === tomorrowKey);

  return {
    region,
    source: "spot-hinta.fi",
    updatedAt: now.toISOString(),
    slots,
    hours,
    today: summarizeDay(todayKey, todayHours),
    tomorrow:
      tomorrowHours.length > 0
        ? summarizeDay(tomorrowKey, tomorrowHours)
        : null,
    current: findCurrentSlot(slots, now),
    next: findNextSlot(slots, now),
  };
}

export async function fetchElectricityPrices(
  region: ElectricityPriceRegion = ELECTRICITY_PRICE_REGION,
): Promise<ElectricityPrices> {
  const url = `${SPOT_HINTA_BASE}/TodayAndDayForward?region=${region}`;
  const res = await fetch(url, {
    next: { revalidate: 60 },
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(`spot-hinta.fi ${res.status}`);
  }

  const rows = (await res.json()) as RawSpotRow[];
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("spot-hinta.fi: empty response");
  }

  return buildElectricityPrices(rows, region);
}
