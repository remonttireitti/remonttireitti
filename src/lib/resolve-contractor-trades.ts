import { parseTradeIds } from "@/lib/contractor-qualifications";
import {
  parseCustomTradeNames,
  resolveOrCreateCommunityTrades,
} from "@/lib/community-trades";

export async function resolveContractorTradeIdsFromForm(
  formData: FormData,
  contractorId: string,
): Promise<{ tradeIds: string[]; error?: string }> {
  const selectedIds = parseTradeIds(formData);
  const customNames = parseCustomTradeNames(formData);

  if (customNames.length === 0) {
    return { tradeIds: selectedIds };
  }

  const created = await resolveOrCreateCommunityTrades(customNames, contractorId);
  if (created.error) {
    return { tradeIds: [], error: created.error };
  }

  return {
    tradeIds: [...new Set([...selectedIds, ...created.ids])],
  };
}
