"use server";

import { createClient } from "@/lib/supabase/server";
import { getProfile, getSessionUser } from "@/lib/auth";
import {
  MARKETPLACE_INVOICE_EMAIL,
  type MarketplacePlanSlug,
} from "@/lib/marketplace-pricing";
import { revalidatePath } from "next/cache";

export type MarketplaceActionState = {
  error?: string;
  success?: string;
};

const VALID_PLAN_SLUGS: MarketplacePlanSlug[] = [
  "contractor_basic",
  "contractor_pro",
  "listing_single",
];

export async function requestContractorPlan(
  _prev: MarketplaceActionState,
  formData: FormData,
): Promise<MarketplaceActionState> {
  const user = await getSessionUser();
  if (!user) return { error: "Kirjaudu sisään." };

  const profile = await getProfile();
  if (profile?.role !== "contractor") {
    return { error: "Vain urakoitsijatileillä voi tilata yrityspaketteja." };
  }

  const planSlug = String(formData.get("plan_slug") ?? "") as MarketplacePlanSlug;
  if (!VALID_PLAN_SLUGS.includes(planSlug)) {
    return { error: "Valitse paketti." };
  }

  const supabase = await createClient();

  const { data: plan } = await supabase
    .from("marketplace_plans")
    .select("id, name_fi, price_eur_cents, is_monthly")
    .eq("slug", planSlug)
    .single();

  if (!plan) return { error: "Pakettia ei löydy." };

  let subscriptionId: string | null = null;

  if (plan.is_monthly) {
    const { data: sub, error: subErr } = await supabase
      .from("seller_subscriptions")
      .insert({
        contractor_id: user.id,
        plan_id: plan.id,
        status: "pending_invoice",
      })
      .select("id")
      .single();

    if (subErr) return { error: "Tilauksen luonti epäonnistui." };
    subscriptionId = sub.id;
  }

  const description = plan.is_monthly
    ? `Markkinapaikka: ${plan.name_fi} (kuukausitilaus)`
    : `Markkinapaikka: ${plan.name_fi}`;

  const { error: billErr } = await supabase.from("marketplace_billing_requests").insert({
    seller_id: user.id,
    kind: plan.is_monthly ? "subscription" : "listing",
    status: "pending",
    plan_id: plan.id,
    subscription_id: subscriptionId,
    amount_eur_cents: plan.price_eur_cents,
    description_fi: description,
  });

  if (billErr) return { error: "Laskutuspyynnön luonti epäonnistui." };

  revalidatePath("/admin/markkinapaikka");
  revalidatePath("/markkinapaikka/tilaa");

  return {
    success: `Tilauspyyntö vastaanotettu. Lasku lähetetään osoitteeseen ${MARKETPLACE_INVOICE_EMAIL} — ilmoitukset aktivoituvat maksun jälkeen.`,
  };
}
