"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  parseJobTypeIds,
  parseRefrigerantLicense,
  parseWorkCapability,
  validateContractorQualifications,
} from "@/lib/contractor-qualifications";
import { parseBidDefaultsByJobType } from "@/lib/contractor-bid-defaults-shared";
import { saveContractorQualifications } from "@/lib/save-contractor-qualifications";
import { createClient } from "@/lib/supabase/server";

export type ContractorProfileState = { error?: string; ok?: string };

export async function updateContractorQualifications(
  _prev: ContractorProfileState,
  formData: FormData,
): Promise<ContractorProfileState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/kirjaudu");

  const qualErr = validateContractorQualifications(formData);
  if (qualErr) return { error: qualErr };

  const companyName = String(formData.get("company_name") ?? "").trim();
  if (!companyName) return { error: "Yrityksen nimi vaaditaan." };

  const saveRes = await saveContractorQualifications({
    contractorId: user.id,
    companyName,
    jobTypeIds: parseJobTypeIds(formData),
    refrigerantLicense: parseRefrigerantLicense(formData)!,
    electricalCapability: parseWorkCapability(
      formData,
      "electrical_capability",
    )!,
    lviCapability: parseWorkCapability(formData, "lvi_capability")!,
  });

  if (saveRes.error) return { error: saveRes.error };

  revalidatePath("/oma-tili");
  revalidatePath("/tarjoukset");
  return { ok: "Pätevyydet tallennettu." };
}

export async function updateContractorBidDefaults(
  _prev: ContractorProfileState,
  formData: FormData,
): Promise<ContractorProfileState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/kirjaudu");

  const jsonRaw = String(formData.get("defaults_by_job_type_json") ?? "");
  let byJob = {};
  try {
    byJob = parseBidDefaultsByJobType(
      jsonRaw ? (JSON.parse(jsonRaw) as unknown) : {},
    );
  } catch {
    return { error: "Oletusehtojen tallennus epäonnistui (virheellinen data)." };
  }

  const { error } = await supabase
    .from("contractor_profiles")
    .update({
      default_bid_terms_by_job_type: byJob,
    })
    .eq("id", user.id);

  if (error) {
    const msg = error.message.includes("default_bid")
      ? "Aja Supabase-migraatio 20260522200000_contractor_bid_defaults_by_job_type.sql"
      : error.message;
    return { error: msg };
  }

  revalidatePath("/oma-tili");
  revalidatePath("/tarjoukset");
  return { ok: "Tarjouksen oletusehdot tallennettu." };
}
