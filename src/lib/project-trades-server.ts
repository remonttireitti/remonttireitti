import type { SupabaseClient } from "@supabase/supabase-js";

export type TradeRef = {
  id: string;
  name: string;
};

export type ProjectTradeContext = {
  projectTrades: TradeRef[];
  matchingTrades: TradeRef[];
  /** @deprecated Prefer projectTrades */
  projectTradeNames: string[];
  /** @deprecated Prefer matchingTrades */
  contractorTradeNames: string[];
  isMultiTrade: boolean;
};

type TradeRow = {
  trade_id: string;
  trades:
    | { name_fi: string; sort_order: number }
    | { name_fi: string; sort_order: number }[]
    | null;
};

function tradeRefs(rows: TradeRow[] | null): TradeRef[] {
  return (rows ?? [])
    .map((row) => {
      const t = row.trades;
      if (!t) return null;
      const trade = Array.isArray(t) ? t[0] : t;
      if (!trade?.name_fi) return null;
      return { id: row.trade_id, name: trade.name_fi };
    })
    .filter(Boolean) as TradeRef[];
}

export async function fetchProjectTradeContextForContractor(
  supabase: SupabaseClient,
  projectId: string,
  contractorId: string,
): Promise<ProjectTradeContext> {
  const [{ data: projectTrades }, { data: contractorTrades }] = await Promise.all([
    supabase
      .from("project_trades")
      .select("trade_id, trades ( name_fi, sort_order )")
      .eq("project_id", projectId),
    supabase
      .from("contractor_trades")
      .select("trade_id, trades ( name_fi, sort_order )")
      .eq("contractor_id", contractorId),
  ]);

  const projectRefs = tradeRefs(projectTrades as TradeRow[] | null);
  const projectTradeIds = new Set(projectRefs.map((t) => t.id));
  const contractorRows = (contractorTrades ?? []) as TradeRow[];
  const matchingRefs = tradeRefs(
    contractorRows.filter((row) => projectTradeIds.has(row.trade_id)),
  );

  return {
    projectTrades: projectRefs,
    matchingTrades: matchingRefs,
    projectTradeNames: projectRefs.map((t) => t.name),
    contractorTradeNames: matchingRefs.map((t) => t.name),
    isMultiTrade: projectRefs.length >= 2,
  };
}

export async function fetchProjectTradeNamesById(
  supabase: SupabaseClient,
  projectId: string,
): Promise<Map<string, string>> {
  const { data } = await supabase
    .from("project_trades")
    .select("trade_id, trades ( name_fi )")
    .eq("project_id", projectId);

  const map = new Map<string, string>();
  for (const row of (data ?? []) as TradeRow[]) {
    const t = row.trades;
    const name = Array.isArray(t) ? t[0]?.name_fi : t?.name_fi;
    if (name) map.set(row.trade_id as string, name);
  }
  return map;
}
