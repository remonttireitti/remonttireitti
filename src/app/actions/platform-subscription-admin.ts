"use server";

import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PlatformSubscriptionSlug } from "@/lib/platform-pricing";
import { extendPlatformSubscriptionUntil } from "@/lib/platform-subscription";
import { revalidatePath } from "next/cache";
import type { AdminState } from "@/app/actions/admin";

export async function markPlatformSubscriptionPaid(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await requireAdmin();

  const requestId = String(formData.get("request_id") ?? "");
  if (!requestId) return { error: "Pyyntö puuttuu." };

  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data: req } = await admin
    .from("platform_billing_requests")
    .select("id, contractor_id, period_slug, status")
    .eq("id", requestId)
    .single();

  if (!req) return { error: "Pyyntöä ei löydy." };
  if (req.status === "paid") return { ok: "Jo maksettu." };
  if (req.status === "cancelled") return { error: "Pyyntö on peruttu." };

  const { data: cp } = await admin
    .from("contractor_profiles")
    .select("platform_subscription_until")
    .eq("id", req.contractor_id)
    .single();

  const nextUntil = extendPlatformSubscriptionUntil(
    cp?.platform_subscription_until ?? null,
    req.period_slug as PlatformSubscriptionSlug,
    new Date(now),
  );

  const { error: reqErr } = await admin
    .from("platform_billing_requests")
    .update({ status: "paid", paid_at: now })
    .eq("id", requestId);

  if (reqErr) return { error: "Maksun merkintä epäonnistui." };

  if (nextUntil) {
    await admin
      .from("contractor_profiles")
      .update({ platform_subscription_until: nextUntil })
      .eq("id", req.contractor_id);
  }

  revalidatePath("/admin/laskutus");
  return { ok: "Tilaus aktivoitu — per-diili -palkkio poissa voimassaolon ajaksi." };
}
