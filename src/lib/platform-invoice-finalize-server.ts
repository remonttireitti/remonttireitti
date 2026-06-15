import type { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

/** Hyväksytyt diilit paitsi peruutetut laskut. */
export async function countContractorPlatformInvoices(
  admin: AdminClient,
  contractorId: string,
): Promise<number> {
  const { count, error } = await admin
    .from("platform_invoices")
    .select("id", { count: "exact", head: true })
    .eq("contractor_id", contractorId)
    .neq("status", "cancelled");

  if (error) {
    console.error("[platform-invoice] count failed", contractorId, error.message);
    return 0;
  }

  return count ?? 0;
}

/** Merkitse lasku maksetuksi ja avaa yhteystiedot (service role). */
export async function finalizePlatformInvoiceAsPaid(
  admin: AdminClient,
  invoiceId: string,
  projectId: string,
): Promise<{ error?: string }> {
  const now = new Date().toISOString();

  const { data: project, error: projectErr } = await admin
    .from("projects")
    .select("accepted_bid_id")
    .eq("id", projectId)
    .single();

  if (projectErr || !project) {
    return { error: "Projektia ei löydy." };
  }

  const { error: invErr } = await admin
    .from("platform_invoices")
    .update({ status: "paid", paid_at: now })
    .eq("id", invoiceId);

  if (invErr) {
    return { error: "Laskun merkintä epäonnistui." };
  }

  await admin
    .from("projects")
    .update({ contact_revealed_at: now })
    .eq("id", projectId);

  if (project.accepted_bid_id) {
    const { error: finalizeErr } = await admin.rpc("finalize_bid_acceptance", {
      p_project_id: projectId,
      p_winning_bid_id: project.accepted_bid_id,
    });
    if (finalizeErr) {
      console.error(
        "[platform-invoice] finalize_bid_acceptance",
        finalizeErr.message,
      );
      return { error: "Diilin viimeistely epäonnistui." };
    }
  }

  return {};
}
