import type { DailyEnergy } from "@/lib/energy-samples";
import { helsinkiDateKey } from "@/lib/energy-samples";
import type { ElectricityPrices, SpotPriceSlot } from "@/lib/electricity-prices";

export type DailyEnergyCost = {
  date: string;
  label: string;
  kwh: number;
  avg_cents_per_kwh: number;
  cost_eur: number;
};

export type EnergyCostSummary = {
  current_price_cents: number | null;
  today_avg_price_cents: number | null;
  today_kwh: number | null;
  today_cost_eur: number | null;
  yesterday_cost_eur: number | null;
  today_vs_yesterday_pct: number | null;
  week_cost_eur: number | null;
  prev_week_cost_eur: number | null;
  week_vs_prev_pct: number | null;
  month_cost_eur: number | null;
  daily: DailyEnergyCost[];
};

function pctChange(current: number | null, previous: number | null): number | null {
  if (current == null || previous == null || previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

function avgCentsForDay(dateKey: string, slots: SpotPriceSlot[]): number | null {
  const daySlots = slots.filter((s) => helsinkiDateKey(s.at) === dateKey);
  if (!daySlots.length) return null;
  return daySlots.reduce((a, s) => a + s.centsPerKwh, 0) / daySlots.length;
}

function kwhToEur(kwh: number, centsPerKwh: number): number {
  return Math.round(kwh * centsPerKwh) / 100;
}

function sumCosts(rows: DailyEnergyCost[]): number | null {
  if (rows.length === 0) return null;
  return Math.round(rows.reduce((a, r) => a + r.cost_eur, 0) * 100) / 100;
}

/** Arvio päivän kustannuksesta: päivän kWh × päivän keskihinta (Nord Pool). */
export function computeEnergyCostSummary(
  daily: DailyEnergy[],
  prices: ElectricityPrices | null,
): EnergyCostSummary {
  const empty: EnergyCostSummary = {
    current_price_cents: prices?.current?.centsPerKwh ?? null,
    today_avg_price_cents: null,
    today_kwh: null,
    today_cost_eur: null,
    yesterday_cost_eur: null,
    today_vs_yesterday_pct: null,
    week_cost_eur: null,
    prev_week_cost_eur: null,
    week_vs_prev_pct: null,
    month_cost_eur: null,
    daily: [],
  };

  if (!prices?.slots?.length) return empty;

  const todayKey = helsinkiDateKey(new Date().toISOString());
  const todayAvg = avgCentsForDay(todayKey, prices.slots);
  empty.today_avg_price_cents = todayAvg;

  const costRows: DailyEnergyCost[] = [];
  for (const day of daily) {
    if (day.kwh == null || day.kwh <= 0) continue;
    const avgCents = avgCentsForDay(day.date, prices.slots);
    if (avgCents == null) continue;
    costRows.push({
      date: day.date,
      label: day.label,
      kwh: day.kwh,
      avg_cents_per_kwh: Math.round(avgCents * 100) / 100,
      cost_eur: kwhToEur(day.kwh, avgCents),
    });
  }

  const last7 = costRows.slice(-7);
  const prev7 = costRows.slice(-14, -7);
  const last30 = costRows.slice(-30);

  const todayRow = costRows.find((r) => r.date === todayKey);
  const yesterdayKey = helsinkiDateKey(new Date(Date.now() - 86_400_000).toISOString());
  const yesterdayRow = costRows.find((r) => r.date === yesterdayKey);

  return {
    current_price_cents: prices.current?.centsPerKwh ?? null,
    today_avg_price_cents: todayAvg,
    today_kwh: todayRow?.kwh ?? daily.find((d) => d.date === todayKey)?.kwh ?? null,
    today_cost_eur: todayRow?.cost_eur ?? null,
    yesterday_cost_eur: yesterdayRow?.cost_eur ?? null,
    today_vs_yesterday_pct: pctChange(todayRow?.cost_eur ?? null, yesterdayRow?.cost_eur ?? null),
    week_cost_eur: sumCosts(last7),
    prev_week_cost_eur: sumCosts(prev7),
    week_vs_prev_pct: pctChange(sumCosts(last7), sumCosts(prev7)),
    month_cost_eur: sumCosts(last30),
    daily: last7,
  };
}

export function formatEur(eur: number | null | undefined, digits = 2): string {
  if (eur == null || !Number.isFinite(eur)) return "—";
  return `${eur.toLocaleString("fi-FI", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })} €`;
}
