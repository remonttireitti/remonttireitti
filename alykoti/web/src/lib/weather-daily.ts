import type { DailyTemp } from "@/lib/energy-samples";

const HELSINKI = "Europe/Helsinki";
const DEFAULT_LAT = 60.1699;
const DEFAULT_LON = 24.9384;

let weatherCache: { at: number; pastDays: number; data: DailyTemp[] } | null = null;
const WEATHER_CACHE_MS = 3_600_000;

function weatherCoords(): { lat: number; lon: number } {
  const lat = Number(process.env.WEATHER_LAT);
  const lon = Number(process.env.WEATHER_LON);
  return {
    lat: Number.isFinite(lat) ? lat : DEFAULT_LAT,
    lon: Number.isFinite(lon) ? lon : DEFAULT_LON,
  };
}

/** Päivittäinen ulkolämpötila (°C) Open-Meteosta — varalla kun IV-data puuttuu. */
export async function fetchWeatherDailyTemps(since: Date): Promise<DailyTemp[]> {
  const pastDays = Math.min(
    20,
    Math.max(1, Math.ceil((Date.now() - since.getTime()) / 86_400_000)),
  );
  const now = Date.now();
  if (weatherCache && weatherCache.pastDays === pastDays && now - weatherCache.at < WEATHER_CACHE_MS) {
    return weatherCache.data;
  }

  const { lat, lon } = weatherCoords();
  const tz = encodeURIComponent(HELSINKI);

  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&daily=temperature_2m_mean&timezone=${tz}&past_days=${pastDays}&forecast_days=1`;

    const res = await fetch(url, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(4_000),
    });
    if (!res.ok) return weatherCache?.data ?? [];

    const data = (await res.json()) as {
      daily?: { time?: string[]; temperature_2m_mean?: (number | null)[] };
    };
    const times = data.daily?.time ?? [];
    const temps = data.daily?.temperature_2m_mean ?? [];

    const rows = times.map((date, i) => ({
      date,
      avg_c: typeof temps[i] === "number" && Number.isFinite(temps[i]) ? temps[i]! : null,
    }));
    weatherCache = { at: now, pastDays, data: rows };
    return rows;
  } catch {
    return weatherCache?.data ?? [];
  }
}

export function mergeDailyTemps(primary: DailyTemp[], fallback: DailyTemp[]): DailyTemp[] {
  const fb = new Map(fallback.map((d) => [d.date, d.avg_c]));
  const dates = new Set([...primary.map((d) => d.date), ...fallback.map((d) => d.date)]);
  return [...dates].sort().map((date) => {
    const row = primary.find((d) => d.date === date);
    if (row?.avg_c != null) return row;
    const avg = fb.get(date);
    return { date, avg_c: avg ?? null };
  });
}
