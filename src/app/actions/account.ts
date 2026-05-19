"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { setContractorBypass } from "@/lib/profile-read";
import { syncContractorAccount } from "@/lib/sync-contractor";
import { redirect } from "next/navigation";

/** Käyttäjä korjaa urakoitsijatilinsä ilman adminia (rekisteröitymisvirhe). */
export async function activateContractorAccount(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/kirjaudu");

  const companyName =
    String(formData.get("company_name") ?? "").trim() ||
    (typeof user.user_metadata?.company_name === "string"
      ? user.user_metadata.company_name.trim()
      : "") ||
    "Yritys (täydennä profiilissa)";

  const fullName =
    (typeof user.user_metadata?.full_name === "string" &&
      user.user_metadata.full_name) ||
    companyName;

  const { error } = await setContractorBypass(user.id, companyName, fullName);
  if (error) {
    redirect(
      `/oma-tili?viesti=vain-urakoitsijalle&virhe=${encodeURIComponent(error)}`,
    );
  }

  await supabase.auth.updateUser({
    data: { role: "contractor", company_name: companyName },
  });

  await syncContractorAccount(user);
  revalidatePath("/oma-tili");
  revalidatePath("/tarjoukset");
  revalidatePath("/markkinapaikka");
  redirect("/tarjoukset");
}
