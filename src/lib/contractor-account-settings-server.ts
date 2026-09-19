import type { SupabaseClient } from "@supabase/supabase-js";
import { contractorLogoSignedUrl } from "@/lib/contractor-branding";
import { fetchContractorBidDefaultsBundle } from "@/lib/contractor-bid-defaults-server";
import { fetchContractorPricingRates } from "@/lib/contractor-pricing-server";
import { getContractorSelectableTrades } from "@/lib/contractor-trade-options";
import {
  companyFactsEnforcementActive,
  parseCompanySizeBand,
  type CompanySizeBand,
} from "@/lib/contractor-company-facts";
import { fetchHeatPumpCatalog, fetchJobCatalog } from "@/lib/job-catalog-server";
import { getContractorQualifications } from "@/lib/save-contractor-qualifications";
import { getContractorCompanyBypass } from "@/lib/profile-read";

export type ContractorAccountSettingsData = {
  companyName: string | null;
  contractorQuals: Awaited<ReturnType<typeof getContractorQualifications>>;
  contractorTrades: { id: string; slug: string; name_fi: string }[];
  heatPumpJobTypes: { id: string; slug: string }[];
  serviceAreaFields: {
    servicePostalCode: string;
    serviceMunicipality: string;
    maxTravelKm: number;
  };
  minBudgetEur: number | null;
  foundedYear: number | null;
  companySizeBand: CompanySizeBand | null;
  billingFields: {
    businessId: string;
    billingEmail: string;
    billingAddressLine: string;
    billingPostalCode: string;
    billingCity: string;
  };
  brandingFields: {
    description: string;
    logoUrl: string | null;
  };
  bidDefaultsBundle: Awaited<ReturnType<typeof fetchContractorBidDefaultsBundle>>;
  pricingRates: Awaited<ReturnType<typeof fetchContractorPricingRates>>;
  requireCompanyFacts: boolean;
};

export async function fetchContractorAccountSettings(
  supabase: SupabaseClient,
  userId: string,
): Promise<ContractorAccountSettingsData> {
  const contractorQuals = await getContractorQualifications(userId);
  let companyName = contractorQuals.companyName || null;
  if (!companyName) {
    companyName = await getContractorCompanyBypass(userId);
  }

  const [jobCatalog, pumpCatalog, bidDefaultsBundle, pricingRates] =
    await Promise.all([
      fetchJobCatalog(),
      fetchHeatPumpCatalog(),
      fetchContractorBidDefaultsBundle(userId),
      fetchContractorPricingRates(userId),
    ]);

  const contractorTrades = getContractorSelectableTrades(jobCatalog.trades);
  const heatPumpJobTypes = pumpCatalog.jobTypes.map((j) => ({
    id: j.id,
    slug: j.slug,
  }));

  let serviceAreaFields = {
    servicePostalCode: "",
    serviceMunicipality: "",
    maxTravelKm: 100,
  };
  let minBudgetEur: number | null = null;
  let foundedYear: number | null = null;
  let companySizeBand: CompanySizeBand | null = null;
  let billingFields = {
    businessId: "",
    billingEmail: "",
    billingAddressLine: "",
    billingPostalCode: "",
    billingCity: "",
  };
  let brandingFields = {
    description: "",
    logoUrl: null as string | null,
  };

  const { data: profileRow } = await supabase
    .from("contractor_profiles")
    .select(
      "business_id, billing_email, billing_address_line, billing_postal_code, billing_city, service_postal_code, service_municipality, max_travel_km, min_budget_eur, founded_year, company_size_band, description, logo_storage_path",
    )
    .eq("id", userId)
    .maybeSingle();

  if (profileRow) {
    billingFields = {
      businessId: profileRow.business_id ?? "",
      billingEmail: profileRow.billing_email ?? "",
      billingAddressLine: profileRow.billing_address_line ?? "",
      billingPostalCode: profileRow.billing_postal_code ?? "",
      billingCity: profileRow.billing_city ?? "",
    };
    serviceAreaFields = {
      servicePostalCode: profileRow.service_postal_code ?? "",
      serviceMunicipality: profileRow.service_municipality ?? "",
      maxTravelKm: profileRow.max_travel_km ?? 100,
    };
    minBudgetEur = (profileRow.min_budget_eur as number | null) ?? null;
    foundedYear = (profileRow.founded_year as number | null) ?? null;
    companySizeBand = parseCompanySizeBand(profileRow.company_size_band);
    brandingFields = {
      description: profileRow.description ?? "",
      logoUrl: await contractorLogoSignedUrl(
        supabase,
        profileRow.logo_storage_path,
      ),
    };
  }

  return {
    companyName,
    contractorQuals,
    contractorTrades,
    heatPumpJobTypes,
    serviceAreaFields,
    minBudgetEur,
    foundedYear,
    companySizeBand,
    billingFields,
    brandingFields,
    bidDefaultsBundle,
    pricingRates,
    requireCompanyFacts: companyFactsEnforcementActive(),
  };
}
