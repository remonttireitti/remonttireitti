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

function calendarDayKeys(count: number): string[] {
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    keys.push(helsinkiDateKey(d.toISOString()));
  }
  return keys;
}

function costForDayKeys(
  daily: DailyEnergy[],
  dayKeys: string[],
  slots: SpotPriceSlot[],
): { cost: number | null; daysWithData: number } {
  let total = 0;
  let daysWithData = 0;
  for (const key of dayKeys) {
    const row = daily.find((d) => d.date === key);
    if (row?.kwh == null || row.kwh <= 0) continue;
    const cents = avgCentsForDay(key, slots);
    if (cents == null) continue;
    total += kwhToEur(row.kwh, cents);
    daysWithData++;
  }
  if (daysWithData === 0) return { cost: null, daysWithData: 0 };
  return { cost: Math.round(total * 100) / 100, daysWithData };
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

  const weekKeys = calendarDayKeys(7);
  const prevWeekKeys = calendarDayKeys(14).slice(0, 7);
  const monthKeys = calendarDayKeys(30);

  const weekCost = costForDayKeys(daily, weekKeys, prices.slots);
  const prevWeekCost = costForDayKeys(daily, prevWeekKeys, prices.slots);
  const monthCost = costForDayKeys(daily, monthKeys, prices.slots);

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
    week_cost_eur: weekCost.daysWithData >= 2 ? weekCost.cost : null,
    prev_week_cost_eur: prevWeekCost.daysWithData >= 2 ? prevWeekCost.cost : null,
    week_vs_prev_pct: pctChange(
      weekCost.daysWithData >= 2 ? weekCost.cost : null,
      prevWeekCost.daysWithData >= 2 ? prevWeekCost.cost : null,
    ),
    month_cost_eur: monthCost.daysWithData >= 3 ? monthCost.cost : null,
    daily: costRows.filter((r) => weekKeys.includes(r.date)),
  };
}

export function formatEur(eur: number | null | undefined, digits = 2): string {
  if (eur == null || !Number.isFinite(eur)) return "—";
  return `${eur.toLocaleString("fi-FI", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })} €`;
}
