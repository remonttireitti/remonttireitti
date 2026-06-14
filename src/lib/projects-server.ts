import type { SupabaseClient } from "@supabase/supabase-js";

/** Projektisivun SELECT (vain olemassa olevat sarakkeet). */
const PROJECT_DETAIL_SELECT = `
  id,
  title,
  description,
  details,
  status,
  municipality,
  postal_code,
  address_line,
  contact_email,
  contact_phone,
  budget_min,
  budget_max,
  desired_start,
  published_at,
  bid_deadline,
  inactivity_warning_sent_at,
  auto_closed_at,
  content_revision,
  accepted_bid_id,
  service_categories ( name_fi )
` as const;

export type CustomerProjectRow = {
  id: string;
  title: string;
  description: string;
  details: unknown;
  status: string;
  municipality: string;
  postal_code: string;
  address_line: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  budget_min: number | null;
  budget_max: number | null;
  desired_start: string | null;
  published_at: string | null;
  bid_deadline: string | null;
  inactivity_warning_sent_at?: string | null;
  auto_closed_at?: string | null;
  content_revision?: number;
  accepted_bid_id?: string | null;
  completion_notes?: string | null;
  completed_at?: string | null;
  contact_revealed_at?: string | null;
  service_categories:
    | { name_fi: string }
    | { name_fi: string }[]
    | null;
};

function rowFromRpc(raw: Record<string, unknown>): CustomerProjectRow {
  return raw as unknown as CustomerProjectRow;
}

/** Hakee asiakkaan oman projektin; RPC-varmuus jos RLS estää suoran SELECTin. */
export async function fetchCustomerProjectById(
  supabase: SupabaseClient,
  projectId: string,
  userId: string,
): Promise<CustomerProjectRow | null> {
  const { data, error } = await supabase
    .from("projects")
    .select(PROJECT_DETAIL_SELECT)
    .eq("id", projectId)
    .eq("customer_id", userId)
    .maybeSingle();

  if (data) return data as CustomerProjectRow;

  if (error) {
    console.error("[fetchCustomerProjectById] select:", error.code, error.message);
  }

  const { data: rpcRows, error: rpcError } = await supabase.rpc(
    "get_customer_project",
    { p_id: projectId },
  );

  if (rpcError) {
    console.error("[fetchCustomerProjectById] rpc:", rpcError.code, rpcError.message);
    return null;
  }

  const row = Array.isArray(rpcRows) ? rpcRows[0] : rpcRows;
  if (!row || typeof row !== "object") return null;

  const project = rowFromRpc(row as Record<string, unknown>);

  const { data: category } = await supabase
    .from("service_categories")
    .select("name_fi")
    .eq("id", (row as { category_id: string }).category_id)
    .maybeSingle();

  return {
    ...project,
    service_categories: category ? { name_fi: category.name_fi } : null,
  };
}
