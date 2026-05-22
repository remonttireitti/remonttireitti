import { createAdminClient } from "@/lib/supabase/admin";
import {
  userNotifyBidAcceptExpiredContractor,
  userNotifyBidAcceptExpiredCustomer,
} from "@/lib/user-notify";
import { isCommitDeadlinePassed } from "@/lib/bid-acceptance";

export type ExpirePendingResult =
  | "not_needed"
  | "still_pending"
  | "paid"
  | "expired";

/**
 * Jos urakoitsija ei ole maksanut määräajassa, palauttaa projektin vertailuun
 * ja hylkää valitun tarjouksen.
 */
export async function expirePendingAcceptanceForProject(
  projectId: string,
): Promise<ExpirePendingResult> {
  const admin = createAdminClient();

  const { data: project } = await admin
    .from("projects")
    .select("id, customer_id, title, status, accepted_bid_id")
    .eq("id", projectId)
    .single();

  if (
    !project ||
    project.status !== "bid_accepted" ||
    !project.accepted_bid_id
  ) {
    return "not_needed";
  }

  const { data: invoice } = await admin
    .from("platform_invoices")
    .select("id, status, due_at, contractor_id, bid_id")
    .eq("project_id", projectId)
    .maybeSingle();

  if (!invoice) return "not_needed";
  if (invoice.status === "paid") return "paid";
  if (invoice.status === "cancelled") return "not_needed";

  if (!isCommitDeadlinePassed(invoice.due_at)) {
    return "still_pending";
  }

  const winBidId = project.accepted_bid_id;

  await admin
    .from("platform_invoices")
    .update({ status: "cancelled" })
    .eq("id", invoice.id);

  await admin
    .from("bids")
    .update({
      status: "rejected",
      rejection_message:
        "Välitysmaksu ei maksettu määräajassa. Asiakas voi valita toisen urakoitsijan.",
      rejected_at: new Date().toISOString(),
    })
    .eq("id", winBidId);

  await admin
    .from("projects")
    .update({
      status: "receiving_bids",
      accepted_bid_id: null,
    })
    .eq("id", projectId);

  const { data: contractor } = await admin
    .from("contractor_profiles")
    .select("company_name")
    .eq("id", invoice.contractor_id)
    .maybeSingle();

  await userNotifyBidAcceptExpiredCustomer({
    customerId: project.customer_id,
    projectId: project.id,
    projectTitle: project.title,
    contractorName: contractor?.company_name ?? "Urakoitsija",
  });

  await userNotifyBidAcceptExpiredContractor({
    contractorId: invoice.contractor_id,
    projectId: project.id,
    projectTitle: project.title,
  });

  return "expired";
}

/** Ajaa vanhentumisen kaikille myöhässä oleville hyväksynnöille (cron). */
export async function expireAllPendingAcceptances(): Promise<number> {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data: rows } = await admin
    .from("platform_invoices")
    .select("project_id")
    .eq("status", "pending")
    .lt("due_at", now);

  let count = 0;
  for (const row of rows ?? []) {
    const result = await expirePendingAcceptanceForProject(row.project_id);
    if (result === "expired") count += 1;
  }
  return count;
}
