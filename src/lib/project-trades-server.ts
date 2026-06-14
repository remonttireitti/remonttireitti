import type { SupabaseClient } from "@supabase/supabase-js";

export type ProjectTradeContext = {
  projectTradeNames: string[];
  contractorTradeNames: string[];
  isMultiTrade: boolean;
};

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

  type TradeRow = {
    trade_id: string;
    trades:
      | { name_fi: string; sort_order: number }
      | { name_fi: string; sort_order: number }[]
      | null;
  };

  function tradeNames(rows: TradeRow[] | null): string[] {
    return (rows ?? [])
      .map((row) => {
        const t = row.trades;
        if (!t) return null;
        return Array.isArray(t) ? t[0]?.name_fi : t.name_fi;
      })
      .filter(Boolean) as string[];
  }

  const projectTradeIds = new Set(
    (projectTrades ?? []).map((row) => row.trade_id as string),
  );
  const contractorRows = (contractorTrades ?? []) as TradeRow[];
  const matchingRows = contractorRows.filter((row) =>
    projectTradeIds.has(row.trade_id),
  );

  const projectTradeNames = tradeNames(projectTrades as TradeRow[] | null);
  const contractorTradeNames = tradeNames(matchingRows);

  return {
    projectTradeNames,
    contractorTradeNames,
    isMultiTrade: projectTradeNames.length >= 2,
  };
}
