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
import {
  allowedBidDefaultsKeys,
  buildBidDefaultsTabs,
  parseBidDefaultsByJobType,
} from "@/lib/contractor-bid-defaults-shared";
import { HEAT_PUMP_MARKETING } from "@/constants/heat-pumps";
import { resolveContractorTradeIdsFromForm } from "@/lib/resolve-contractor-trades";
import {
  companyFactsEnforcementActive,
  validateCompanyFactsForm,
} from "@/lib/contractor-company-facts";
import { saveContractorQualifications, getContractorQualifications } from "@/lib/save-contractor-qualifications";
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

  const shouldValidateFacts =
    companyFactsEnforcementActive() ||
    String(formData.get("founded_year") ?? "").trim() !== "" ||
    String(formData.get("company_size_band") ?? "").trim() !== "";

  let factsToSave: {
    founded_year: number;
    company_size_band: string;
  } | null = null;

  if (shouldValidateFacts) {
    const factsResult = validateCompanyFactsForm(formData);
    if (!factsResult.ok) return { error: factsResult.error };
    factsToSave = factsResult.facts;
  }

  const resolvedTrades = await resolveContractorTradeIdsFromForm(formData, user.id);
  if (resolvedTrades.error) return { error: resolvedTrades.error };

  const saveRes = await saveContractorQualifications({
    contractorId: user.id,
    companyName,
    tradeIds: resolvedTrades.tradeIds,
    jobTypeIds: parseJobTypeIds(formData),
    refrigerantLicense: parseRefrigerantLicense(formData),
    electricalQualification: parseElectricalQualification(formData),
    lviQualifications: parseLviQualifications(formData),
  });

  if (saveRes.error) return { error: saveRes.error };

  if (factsToSave) {
    const { error: factsErr } = await supabase
      .from("contractor_profiles")
      .update({
        founded_year: factsToSave.founded_year,
        company_size_band: factsToSave.company_size_band,
        years_in_business:
          new Date().getFullYear() - factsToSave.founded_year,
      })
      .eq("id", user.id);

    if (factsErr) {
      const msg = factsErr.message ?? "";
      const missingCompanyFactsColumn =
        factsErr.code === "PGRST204" ||
        factsErr.code === "42703" ||
        msg.includes("schema cache") ||
        msg.includes("founded_year") ||
        msg.includes("company_size_band");
      if (missingCompanyFactsColumn) {
        return {
          error:
            "Yritystietojen sarakkeet puuttuvat tietokannasta. Aja Supabase SQL Editorissa supabase/PRODUCTION_APPLY_COMPANY_FACTS.sql ja yritä tallennusta uudelleen.",
        };
      }
      return { error: msg || "Yritystietojen tallennus epäonnistui." };
    }
  }

  revalidatePath("/oma-tili");
  revalidatePath("/tarjoukset");
  revalidatePath("/remontti");
  return { ok: "Profiili ja yritystiedot tallennettu." };
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
    const parsed = jsonRaw ? (JSON.parse(jsonRaw) as unknown) : {};
    const quals = await getContractorQualificationsForDefaults(user.id);
    byJob = parseBidDefaultsByJobType(parsed, quals.allowedKeys);
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

async function getContractorQualificationsForDefaults(contractorId: string) {
  const supabase = await createClient();
  const quals = await getContractorQualifications(contractorId);

  const trades =
    quals.tradeSlugs.length > 0
      ? (
          await supabase
            .from("trades")
            .select("slug, name_fi")
            .in("slug", quals.tradeSlugs)
            .order("sort_order")
        ).data ?? []
      : [];

  const tabs = buildBidDefaultsTabs({
    jobTypeSlugs: quals.jobTypeSlugs,
    trades: trades.map((t) => ({
      slug: t.slug as string,
      name_fi: t.name_fi as string,
    })),
    heatPumpLabels: HEAT_PUMP_MARKETING,
  });

  return { allowedKeys: allowedBidDefaultsKeys(tabs) };
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

export async function updateContractorWorkPreferences(
  _prev: ContractorProfileState,
  formData: FormData,
): Promise<ContractorProfileState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/kirjaudu");

  const raw = String(formData.get("min_budget_eur") ?? "").trim();
  let minBudgetEur: number | null = null;

  if (raw) {
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0) {
      return { error: "Minimibudjetin tulee olla nolla tai suurempi." };
    }
    minBudgetEur = Math.round(value);
  }

  const { error } = await supabase
    .from("contractor_profiles")
    .update({ min_budget_eur: minBudgetEur })
    .eq("id", user.id);

  if (error) {
    const msg = error.message.includes("min_budget_eur")
      ? "Aja Supabase-migraatio 20260913160000_contractor_work_filter.sql"
      : error.message;
    return { error: msg };
  }

  revalidatePath("/oma-tili");
  revalidatePath("/tarjoukset");
  return { ok: "Työfiltteri tallennettu." };
}
