"use server";

import { getProfile, getSessionUser } from "@/lib/auth";
import {
  PLATFORM_INVOICE_EMAIL,
  getPlatformSubscriptionPlan,
  type PlatformSubscriptionSlug,
} from "@/lib/platform-pricing";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type PlatformSubscriptionActionState = {
  error?: string;
  success?: string;
};

const VALID_SLUGS = new Set<PlatformSubscriptionSlug>([
  "platform_1m",
  "platform_3m",
  "platform_6m",
  "platform_12m",
]);

export async function requestPlatformSubscription(
  _prev: PlatformSubscriptionActionState,
  formData: FormData,
): Promise<PlatformSubscriptionActionState> {
  const user = await getSessionUser();
  if (!user) return { error: "Kirjaudu sisään." };

  const profile = await getProfile();
  if (profile?.role !== "contractor") {
    return { error: "Vain urakoitsijatileillä voi tilata kuukausijakson." };
  }

  const periodSlug = String(formData.get("period_slug") ?? "") as PlatformSubscriptionSlug;
  if (!VALID_SLUGS.has(periodSlug)) {
    return { error: "Valitse laskutusjakso." };
  }

  const plan = getPlatformSubscriptionPlan(periodSlug);
  if (!plan) return { error: "Jaksoa ei löydy." };

  const supabase = await createClient();
  const description =
    plan.months === 1
      ? `Tarjouskilpailu: kuukausitilaus 1 kk`
      : `Tarjouskilpailu: kuukausitilaus ${plan.months} kk`;

  const { error } = await supabase.from("platform_billing_requests").insert({
    contractor_id: user.id,
    period_slug: plan.slug,
    subscription_months: plan.months,
    status: "pending",
    amount_eur_cents: plan.totalCents,
    description_fi: description,
  });

  if (error) return { error: "Tilauspyynnön luonti epäonnistui." };

  revalidatePath("/admin/laskutus");
  revalidatePath("/urakoitsijaksi/tilaa");

  return {
    success: `Tilauspyyntö vastaanotettu. Lasku lähetetään osoitteeseen ${PLATFORM_INVOICE_EMAIL} — tilaus aktivoituu maksun jälkeen (yleensä 1–2 arkipäivää).`,
  };
}
