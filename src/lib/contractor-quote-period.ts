export type ContractorQuoteStatsPeriod = "week" | "month" | "year";

export function parseQuoteStatsPeriod(
  raw: string | null | undefined,
): ContractorQuoteStatsPeriod {
  if (raw === "kk" || raw === "month") return "month";
  if (raw === "vuosi" || raw === "year") return "year";
  return "week";
}

export function statsPeriodBounds(
  period: ContractorQuoteStatsPeriod,
  now = new Date(),
): {
  startIso: string;
  endIso: string;
  label: string;
  period: ContractorQuoteStatsPeriod;
} {
  const endIso = now.toISOString();
  let start: Date;
  let label: string;

  if (period === "year") {
    start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
    label = String(now.getFullYear());
  } else if (period === "month") {
    start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    label = now.toLocaleDateString("fi-FI", { month: "long", year: "numeric" });
  } else {
    start = new Date(now);
    const day = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - day);
    start.setHours(0, 0, 0, 0);
    label = "Tällä viikolla";
  }

  return {
    startIso: start.toISOString(),
    endIso,
    label,
    period,
  };
}
