"use server";

import { createClient } from "@/lib/supabase/server";
import { PLATFORM_FEE_VAT_RATE } from "@/lib/platform-fee";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type PlatformInvoiceActionState = {
  error?: string;
  success?: string;
};

/** Kehitys / testi: merkitse oma lasku maksetuksi (Stripe myöhemmin). */
export async function simulatePayPlatformInvoice(
  _prev: PlatformInvoiceActionState,
  formData: FormData,
): Promise<PlatformInvoiceActionState> {
  if (process.env.PLATFORM_FEE_SIMULATE !== "true") {
    return { error: "Maksun simulointi ei ole käytössä." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Kirjaudu sisään." };

  const invoiceId = String(formData.get("invoice_id") ?? "");
  if (!invoiceId) return { error: "Lasku puuttuu." };

  const { data: invoice } = await supabase
    .from("platform_invoices")
    .select("id, contractor_id, project_id, status")
    .eq("id", invoiceId)
    .single();

  if (!invoice || invoice.contractor_id !== user.id) {
    return { error: "Laskua ei löydy." };
  }

  if (invoice.status === "paid") {
    return { success: "Lasku on jo maksettu." };
  }

  const { error } = await supabase.rpc("mark_platform_invoice_paid", {
    invoice_id: invoiceId,
  });

  if (error) {
    return { error: "Maksun merkintä epäonnistui." };
  }

  revalidatePath(`/tarjoukset/urakka/${invoice.project_id}`);
  revalidatePath(`/remontti/${invoice.project_id}`);
  redirect(`/tarjoukset/urakka/${invoice.project_id}?maksu=ok`);
}

export async function createPlatformInvoiceForBid(
  supabase: Awaited<ReturnType<typeof createClient>>,
  params: {
    projectId: string;
    bidId: string;
    contractorId: string;
    dueAt: string;
    amountCents: number;
  },
): Promise<{ error?: string; invoiceId?: string }> {
  const { data, error } = await supabase
    .from("platform_invoices")
    .insert({
      project_id: params.projectId,
      bid_id: params.bidId,
      contractor_id: params.contractorId,
      amount_cents: params.amountCents,
      vat_rate: PLATFORM_FEE_VAT_RATE,
      status: "pending",
      due_at: params.dueAt,
    })
    .select("id")
    .single();

  if (error) {
    return { error: "Välityslaskun luonti epäonnistui." };
  }
  return { invoiceId: data.id };
}
