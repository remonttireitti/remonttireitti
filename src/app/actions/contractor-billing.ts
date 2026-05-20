"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ContractorBillingState = { error?: string; ok?: string };

export async function updateContractorBilling(
  _prev: ContractorBillingState,
  formData: FormData,
): Promise<ContractorBillingState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/kirjaudu");

  const businessId = String(formData.get("business_id") ?? "").trim();
  const billingEmail = String(formData.get("billing_email") ?? "").trim();
  const billingAddressLine = String(
    formData.get("billing_address_line") ?? "",
  ).trim();
  const billingPostalCode = String(
    formData.get("billing_postal_code") ?? "",
  ).trim();
  const billingCity = String(formData.get("billing_city") ?? "").trim();

  if (billingEmail && !billingEmail.includes("@")) {
    return { error: "Tarkista laskutus-sähköposti." };
  }

  const { error } = await supabase
    .from("contractor_profiles")
    .update({
      business_id: businessId || null,
      billing_email: billingEmail || null,
      billing_address_line: billingAddressLine || null,
      billing_postal_code: billingPostalCode || null,
      billing_city: billingCity || null,
    })
    .eq("id", user.id);

  if (error) return { error: "Tallennus epäonnistui." };

  revalidatePath("/oma-tili");
  revalidatePath("/admin/laskutus");
  return { ok: "Laskutustiedot tallennettu." };
}
