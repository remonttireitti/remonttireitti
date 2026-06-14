"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  parseElectricalQualification,
  parseJobTypeIds,
  parseLviQualifications,
  parseRefrigerantLicense,
  parseTradeIds,
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
    tradeIds: parseTradeIds(formData),
    jobTypeIds: parseJobTypeIds(formData),
    refrigerantLicense: parseRefrigerantLicense(formData),
    electricalQualification: parseElectricalQualification(formData),
    lviQualifications: parseLviQualifications(formData),
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

export async function updateContractorServiceArea(
  _prev: ContractorProfileState,
  formData: FormData,
): Promise<ContractorProfileState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/kirjaudu");

  const postalCode = String(formData.get("service_postal_code") ?? "").trim();
  const municipality = String(formData.get("service_municipality") ?? "").trim();
  const maxTravelKm = Number(formData.get("max_travel_km"));

  if (postalCode && !/^\d{5}$/.test(postalCode)) {
    return { error: "Postinumeron tulee olla viisi numeroa." };
  }
  if (!postalCode && !municipality) {
    return { error: "Anna vähintään postinumero tai kunta." };
  }
  if (!Number.isFinite(maxTravelKm) || maxTravelKm < 10 || maxTravelKm > 500) {
    return { error: "Matkustusetäisyyden tulee olla 10–500 km." };
  }

  const { error } = await supabase
    .from("contractor_profiles")
    .update({
      service_postal_code: postalCode || null,
      service_municipality: municipality || null,
      max_travel_km: Math.round(maxTravelKm),
    })
    .eq("id", user.id);

  if (error) {
    const msg = error.message.includes("service_postal_code")
      ? "Aja Supabase-migraatio 20260614170000_contractor_service_location.sql"
      : error.message;
    return { error: msg };
  }

  revalidatePath("/oma-tili");
  revalidatePath("/tarjoukset");
  return { ok: "Toimipaikka tallennettu." };
}
