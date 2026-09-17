import type { SupabaseClient } from "@supabase/supabase-js";

export const CONTRACT_SUMMARY_STATUSES = [
  "bid_accepted",
  "in_progress",
  "completed",
] as const;

export function formatContractReference(projectId: string): string {
  return `RR-${projectId.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

export function formatContractDateTimeFi(iso: string): string {
  return new Date(iso).toLocaleString("fi-FI", {
    dateStyle: "long",
    timeStyle: "short",
  });
}

export function contractPdfFilename(projectTitle: string, projectId: string): string {
  const slug = projectTitle
    .toLowerCase()
    .replace(/[^a-z0-9äöå]+/gi, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  const ref = formatContractReference(projectId);
  return `urakkasopimus-${slug || ref}-${ref}.pdf`;
}

export async function canAccessContractSummary(
  supabase: SupabaseClient,
  userId: string,
  project: {
    customer_id: string;
    accepted_bid_id: string | null;
    status: string;
  },
): Promise<boolean> {
  if (!project.accepted_bid_id) return false;
  if (
    !CONTRACT_SUMMARY_STATUSES.includes(
      project.status as (typeof CONTRACT_SUMMARY_STATUSES)[number],
    )
  ) {
    return false;
  }
  if (project.customer_id === userId) return true;

  const { data: bid } = await supabase
    .from("bids")
    .select("id")
    .eq("id", project.accepted_bid_id)
    .eq("contractor_id", userId)
    .maybeSingle();

  return Boolean(bid);
}
