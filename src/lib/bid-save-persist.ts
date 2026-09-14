import type { SupabaseClient } from "@supabase/supabase-js";

/** Sarakkeet joita ei välttämättä ole tuotannossa ennen migraatiota. */
const OPTIONAL_TRADE_SCOPE_COLUMNS = [
  "offered_trade_ids",
  "turnkey_coordination",
  "offer_scope",
] as const;

const OPTIONAL_BID_COLUMNS = [
  ...OPTIONAL_TRADE_SCOPE_COLUMNS,
  "content_updated_at",
  "is_admin_preview",
] as const;

export function isMissingColumnError(error: {
  code?: string;
  message?: string;
}): boolean {
  const code = error.code ?? "";
  const msg = (error.message ?? "").toLowerCase();

  return (
    code === "42703" ||
    code === "PGRST204" ||
    (msg.includes("column") &&
      (msg.includes("does not exist") || msg.includes("schema cache"))) ||
    msg.includes("could not find")
  );
}

export function stripOptionalTradeScopeColumns<T extends Record<string, unknown>>(
  row: T,
): T {
  const copy = { ...row } as Record<string, unknown>;
  for (const key of OPTIONAL_BID_COLUMNS) {
    delete copy[key];
  }
  return copy as T;
}

export async function insertBidRow(
  supabase: SupabaseClient,
  row: Record<string, unknown>,
): Promise<{ error: { code?: string; message?: string } | null }> {
  const first = await supabase.from("bids").insert(row);
  if (!first.error || !isMissingColumnError(first.error)) {
    return first;
  }

  console.warn(
    "[insertBidRow] Trade scope columns missing — retrying legacy insert:",
    first.error.message,
  );
  return supabase.from("bids").insert(stripOptionalTradeScopeColumns(row));
}

export async function updateBidRow(
  supabase: SupabaseClient,
  row: Record<string, unknown>,
  bidId: string,
  contractorId: string,
): Promise<{ error: { code?: string; message?: string } | null }> {
  const first = await supabase
    .from("bids")
    .update(row)
    .eq("id", bidId)
    .eq("contractor_id", contractorId);

  if (!first.error || !isMissingColumnError(first.error)) {
    return first;
  }

  console.warn(
    "[updateBidRow] Trade scope columns missing — retrying legacy update:",
    first.error.message,
  );
  return supabase
    .from("bids")
    .update(stripOptionalTradeScopeColumns(row))
    .eq("id", bidId)
    .eq("contractor_id", contractorId);
}
