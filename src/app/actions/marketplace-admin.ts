"use server";

import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { LISTING_DURATION_DAYS } from "@/lib/marketplace-pricing";
import { revalidatePath } from "next/cache";
import type { AdminState } from "@/app/actions/admin";

export async function markMarketplaceBillingPaid(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await requireAdmin();

  const requestId = String(formData.get("request_id") ?? "");
  if (!requestId) return { error: "Pyyntö puuttuu." };

  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data: req } = await admin
    .from("marketplace_billing_requests")
    .select(
      "id, kind, subscription_id, listing_id, status",
    )
    .eq("id", requestId)
    .single();

  if (!req) return { error: "Laskutuspyyntöä ei löydy." };
  if (req.status === "paid") return { ok: "Jo maksettu." };

  await admin
    .from("marketplace_billing_requests")
    .update({ status: "paid", paid_at: now })
    .eq("id", requestId);

  if (req.kind === "subscription" && req.subscription_id) {
    const start = new Date();
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);

    await admin
      .from("seller_subscriptions")
      .update({
        status: "active",
        period_start: start.toISOString().slice(0, 10),
        period_end: end.toISOString().slice(0, 10),
        listings_published_this_period: 0,
      })
      .eq("id", req.subscription_id);
  }

  if (req.listing_id) {
    const expires = new Date();
    expires.setDate(expires.getDate() + LISTING_DURATION_DAYS.paid);

    await admin
      .from("equipment_listings")
      .update({
        status: "published",
        published_at: now,
        expires_at: expires.toISOString(),
      })
      .eq("id", req.listing_id);
  }

  revalidatePath("/admin/laskutus");
  revalidatePath("/admin/markkinapaikka");
  revalidatePath("/markkinapaikka/ilmoitukset");
  return { ok: "Merkattu maksetuksi." };
}

export async function markMarketplaceBillingInvoiced(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await requireAdmin();

  const requestId = String(formData.get("request_id") ?? "");
  const reference = String(formData.get("invoice_reference") ?? "").trim();

  if (!requestId) return { error: "Pyyntö puuttuu." };

  const admin = createAdminClient();

  const { error } = await admin
    .from("marketplace_billing_requests")
    .update({
      status: "invoiced",
      invoiced_at: new Date().toISOString(),
      invoice_reference: reference || null,
    })
    .eq("id", requestId);

  if (error) return { error: "Päivitys epäonnistui." };

  revalidatePath("/admin/laskutus");
  revalidatePath("/admin/markkinapaikka");
  return { ok: "Merkitty laskutetuksi." };
}
