"use server";

import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import type { AdminState } from "@/app/actions/admin";

export async function markPlatformInvoiceInvoiced(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await requireAdmin();

  const invoiceId = String(formData.get("invoice_id") ?? "");
  const reference = String(formData.get("invoice_reference") ?? "").trim();
  const notes = String(formData.get("admin_notes") ?? "").trim();

  if (!invoiceId) return { error: "Lasku puuttuu." };

  const admin = createAdminClient();

  const { data: inv } = await admin
    .from("platform_invoices")
    .select("id, status")
    .eq("id", invoiceId)
    .single();

  if (!inv) return { error: "Laskua ei löydy." };
  if (inv.status === "paid") return { error: "Lasku on jo maksettu." };
  if (inv.status === "cancelled") return { error: "Lasku on peruttu." };

  const { error } = await admin
    .from("platform_invoices")
    .update({
      invoiced_at: new Date().toISOString(),
      invoice_reference: reference || null,
      admin_notes: notes || null,
    })
    .eq("id", invoiceId);

  if (error) return { error: "Päivitys epäonnistui." };

  revalidatePath("/admin/laskutus");
  return { ok: "Merkitty laskutetuksi." };
}

export async function markPlatformInvoicePaid(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await requireAdmin();

  const invoiceId = String(formData.get("invoice_id") ?? "");
  if (!invoiceId) return { error: "Lasku puuttuu." };

  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data: inv } = await admin
    .from("platform_invoices")
    .select("id, project_id, status")
    .eq("id", invoiceId)
    .single();

  if (!inv) return { error: "Laskua ei löydy." };
  if (inv.status === "paid") return { ok: "Jo maksettu." };

  const { error: invErr } = await admin
    .from("platform_invoices")
    .update({ status: "paid", paid_at: now })
    .eq("id", invoiceId);

  if (invErr) return { error: "Maksun merkintä epäonnistui." };

  await admin
    .from("projects")
    .update({ contact_revealed_at: now })
    .eq("id", inv.project_id);

  revalidatePath("/admin/laskutus");
  revalidatePath(`/remontti/${inv.project_id}`);
  revalidatePath(`/tarjoukset/urakka/${inv.project_id}`);
  return { ok: "Merkattu maksetuksi — yhteystiedot avattu urakoitsijalle." };
}
