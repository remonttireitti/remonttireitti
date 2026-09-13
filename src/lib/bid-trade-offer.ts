export type TurnkeyCoordination = "subcontract" | "customer_sources";

export const TURNKEY_COORDINATION_LABELS: Record<TurnkeyCoordination, string> = {
  subcontract: "Hoidan puuttuvat ammatit alihankkijalla",
  customer_sources: "Asiakas hankkii puuttuvat ammatit erikseen",
};

export function parseTurnkeyCoordination(
  raw: string | null | undefined,
): TurnkeyCoordination | null {
  if (raw === "subcontract" || raw === "customer_sources") return raw;
  return null;
}

export function parseOfferedTradeIds(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((id): id is string => typeof id === "string" && id.length > 0);
  }
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (id): id is string => typeof id === "string" && id.length > 0,
        );
      }
    } catch {
      return raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  return [];
}

export function formatOfferedTradeNames(
  offeredIds: string[] | null | undefined,
  tradeNamesById: Map<string, string>,
  fallbackNames?: string[],
): string | null {
  if (offeredIds && offeredIds.length > 0) {
    const names = offeredIds
      .map((id) => tradeNamesById.get(id))
      .filter(Boolean) as string[];
    if (names.length > 0) return names.join(", ");
  }
  if (fallbackNames && fallbackNames.length > 0) {
    return fallbackNames.join(", ");
  }
  return null;
}

export function formatBidTradeScopeSummary(params: {
  offerScope: "turnkey" | "own_trade" | null;
  offeredTradeNames: string | null;
  turnkeyCoordination: TurnkeyCoordination | null;
}): string | null {
  if (!params.offerScope) return params.offeredTradeNames;

  if (params.offerScope === "own_trade") {
    return params.offeredTradeNames
      ? `Oman ammattini osuus: ${params.offeredTradeNames}`
      : "Vain oman ammattini osuus";
  }

  const base = "Kokonaisurakka";
  if (!params.turnkeyCoordination) return base;
  return `${base} — ${TURNKEY_COORDINATION_LABELS[params.turnkeyCoordination]}`;
}
