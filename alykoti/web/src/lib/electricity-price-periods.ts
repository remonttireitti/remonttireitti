import {
  findCurrentSlot,
  helsinkiDateKey,
  type ElectricityPrices,
  type SpotPriceSlot,
} from "@/lib/electricity-prices";

export type ElectricityPricePeriodMode = "cheapest_slots" | "below_cents";

export type ElectricityPricePeriod = {
  id: string;
  name: string;
  mode: ElectricityPricePeriodMode;
  /** Halvimmat N kpl 15 min jaksoja päivässä (4 = 1 h). */
  cheapest_slots?: number;
  /** Aktiivinen kun hinta alle tämän (c/kWh, ALV mukana). */
  below_cents?: number;
};

export function newElectricityPeriodId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `period-${Date.now()}`;
}

export function normalizeElectricityPricePeriods(raw: unknown): ElectricityPricePeriod[] {
  if (!Array.isArray(raw)) return [];
  const out: ElectricityPricePeriod[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const p = item as Record<string, unknown>;
    if (typeof p.id !== "string" || typeof p.name !== "string") continue;
    const mode = p.mode;
    if (mode !== "cheapest_slots" && mode !== "below_cents") continue;
    const period: ElectricityPricePeriod = {
      id: p.id,
      name: p.name.trim() || "Jakso",
      mode,
    };
    if (mode === "cheapest_slots") {
      const n = p.cheapest_slots;
      period.cheapest_slots =
        typeof n === "number" && Number.isFinite(n) ? Math.max(1, Math.min(96, Math.round(n))) : 8;
    }
    if (mode === "below_cents") {
      const c = p.below_cents;
      period.below_cents =
        typeof c === "number" && Number.isFinite(c) ? Math.max(0, Math.round(c * 100) / 100) : 5;
    }
    out.push(period);
  }
  return out;
}

export function periodModeLabel(mode: ElectricityPricePeriodMode): string {
  return mode === "cheapest_slots" ? "Halvimmat jaksot" : "Alle hintarajan";
}

export function periodSummary(period: ElectricityPricePeriod): string {
  if (period.mode === "cheapest_slots") {
    const slots = period.cheapest_slots ?? 8;
    const hours = slots / 4;
    return `${slots} halvinta 15 min jaksoa (${hours} h)`;
  }
  return `Alle ${period.below_cents ?? 5} c/kWh`;
}

export function cheapestSlotsForDay(slots: SpotPriceSlot[], count: number): Set<string> {
  const sorted = [...slots].sort((a, b) => a.centsPerKwh - b.centsPerKwh);
  const pick = sorted.slice(0, Math.max(1, count));
  return new Set(pick.map((s) => s.at));
}

export function isPeriodActive(
  period: ElectricityPricePeriod,
  prices: ElectricityPrices,
  now = new Date(),
): boolean {
  const current = findCurrentSlot(prices.slots, now);
  if (!current) return false;

  const todayKey = helsinkiDateKey(now.toISOString());
  const todaySlots = prices.today.slots.length
    ? prices.today.slots
    : prices.slots.filter((s) => helsinkiDateKey(s.at) === todayKey);

  if (period.mode === "below_cents") {
    const limit = period.below_cents ?? 5;
    return current.centsPerKwh <= limit;
  }

  const n = period.cheapest_slots ?? 8;
  const cheapest = cheapestSlotsForDay(todaySlots, n);
  return cheapest.has(current.at);
}

export function periodSlotKey(periodId: string, slotAt: string): string {
  return `${periodId}:${slotAt}`;
}
