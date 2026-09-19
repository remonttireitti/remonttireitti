import type { CalculatorLineItem } from "./types";

export type CalculatedLine = {
  id: string;
  label: string;
  amount: number;
  enabled: boolean;
};

export function clampQuantity(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function lineItemTotal(
  item: CalculatorLineItem,
  primaryQty: number,
  secondaryQty = 0,
): number {
  if (!item.enabled) return 0;
  if (item.unit === "fixed") return Math.round(item.amount);
  if (item.unit === "per_secondary") {
    return Math.round(item.amount * secondaryQty);
  }
  const raw = item.amount * primaryQty;
  if (item.minAmount != null) return Math.round(Math.max(item.minAmount, raw));
  return Math.round(raw);
}

export function calculateEstimate(
  primaryQty: number,
  secondaryQty: number,
  items: CalculatorLineItem[],
): { lines: CalculatedLine[]; total: number } {
  const lines = items.map((item) => ({
    id: item.id,
    label: item.label,
    amount: lineItemTotal(item, primaryQty, secondaryQty),
    enabled: item.enabled,
  }));
  const total = lines.reduce((sum, line) => sum + line.amount, 0);
  return { lines, total };
}

export function googlePriceSearch(query: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

export function formatEuro(amount: number): string {
  return `${amount.toLocaleString("fi-FI")} €`;
}

export function newCustomLineItem(): CalculatorLineItem {
  return {
    id: `custom-${Date.now()}`,
    label: "Oma kulu",
    description: "",
    unit: "fixed",
    amount: 0,
    enabled: true,
    custom: true,
  };
}

export function applyTierOverrides(
  items: CalculatorLineItem[],
  overrides: Record<string, number>,
): CalculatorLineItem[] {
  return items.map((item) =>
    item.id in overrides ? { ...item, amount: overrides[item.id]! } : item,
  );
}
