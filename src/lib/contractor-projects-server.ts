import type { SupabaseClient } from "@supabase/supabase-js";
import {
  evaluateProjectMatch,
  type ContractorMatchProfile,
  type ProjectMatchInput,
  type ProjectMatchResult,
} from "@/lib/contractor-project-match";
import { projectDistanceKm } from "@/lib/geo-distance";

export type ContractorOpenProject = {
  id: string;
  title: string;
  municipality: string;
  postal_code: string;
  status: string;
  budget_min: number | null;
  budget_max: number | null;
  created_at: string;
  job_type_id: string | null;
  job_type_slug: string | null;
  job_type_name: string | null;
  category_name: string;
  trade_ids: string[];
  trade_slugs: string[];
  match: ProjectMatchResult;
};

export async function fetchContractorOpenProjects(
  supabase: SupabaseClient,
  contractor: ContractorMatchProfile,
): Promise<ContractorOpenProject[]> {
  const { data: projectsRaw } = await supabase
    .from("projects")
    .select(
      `id, title, municipality, postal_code, status, budget_min, budget_max, created_at, job_type_id,
       service_categories ( name_fi ),
       job_types ( name_fi, slug )`,
    )
    .in("status", ["published", "receiving_bids"])
    .order("created_at", { ascending: false });

  type RawRow = {
    id: string;
    title: string;
    municipality: string;
    postal_code: string;
    status: string;
    budget_min: number | null;
    budget_max: number | null;
    created_at: string;
    job_type_id: string | null;
    service_categories: { name_fi: string } | { name_fi: string }[] | null;
    job_types:
      | { name_fi: string; slug: string }
      | { name_fi: string; slug: string }[]
      | null;
  };

  const rows = (projectsRaw ?? []) as RawRow[];
  if (rows.length === 0) return [];

  const projectIds = rows.map((p) => p.id);
  const { data: projectTrades } = await supabase
    .from("project_trades")
    .select("project_id, trade_id, trades ( slug )")
    .in("project_id", projectIds);

  type TradeLink = {
    project_id: string;
    trade_id: string;
    trades: { slug: string } | { slug: string }[] | null;
  };

  const tradesByProject = new Map<string, { ids: string[]; slugs: string[] }>();
  for (const row of (projectTrades ?? []) as TradeLink[]) {
    const entry = tradesByProject.get(row.project_id) ?? { ids: [], slugs: [] };
    entry.ids.push(row.trade_id);
    const t = row.trades;
    const slug = Array.isArray(t) ? t[0]?.slug : t?.slug;
    if (slug) entry.slugs.push(slug);
    tradesByProject.set(row.project_id, entry);
  }

  const withMatch: ContractorOpenProject[] = [];

  for (const p of rows) {
    const sc = p.service_categories;
    const jt = p.job_types;
    const categoryName = Array.isArray(sc)
      ? (sc[0]?.name_fi ?? "Remontti")
      : (sc?.name_fi ?? "Remontti");
    const jobTypeName = Array.isArray(jt) ? jt[0]?.name_fi : jt?.name_fi;
    const jobTypeSlug = Array.isArray(jt) ? jt[0]?.slug : jt?.slug;
    const trades = tradesByProject.get(p.id) ?? { ids: [], slugs: [] };

    const projectInput: ProjectMatchInput = {
      id: p.id,
      jobTypeId: p.job_type_id,
      jobTypeSlug: jobTypeSlug ?? null,
      tradeIds: trades.ids,
      tradeSlugs: trades.slugs,
      municipality: p.municipality,
      postalCode: p.postal_code,
    };

    const distanceKm = await projectDistanceKm(
      supabase,
      contractor.servicePostalCode,
      contractor.serviceMunicipality,
      p.postal_code,
      p.municipality,
    );

    withMatch.push({
      id: p.id,
      title: p.title,
      municipality: p.municipality,
      postal_code: p.postal_code,
      status: p.status,
      budget_min: p.budget_min,
      budget_max: p.budget_max,
      created_at: p.created_at,
      job_type_id: p.job_type_id,
      job_type_slug: jobTypeSlug ?? null,
      job_type_name: jobTypeName ?? null,
      category_name: categoryName,
      trade_ids: trades.ids,
      trade_slugs: trades.slugs,
      match: evaluateProjectMatch(contractor, projectInput, distanceKm),
    });
  }

  withMatch.sort((a, b) => {
    if (a.match.recommended !== b.match.recommended) {
      return a.match.recommended ? -1 : 1;
    }
    const rank = { full: 0, partial: 1, na: 2, none: 3 };
    if (a.match.qualificationFit !== b.match.qualificationFit) {
      return rank[a.match.qualificationFit] - rank[b.match.qualificationFit];
    }
    const distA = a.match.distanceKm ?? 9999;
    const distB = b.match.distanceKm ?? 9999;
    if (distA !== distB) return distA - distB;
    return b.created_at.localeCompare(a.created_at);
  });

  return withMatch;
}

export async function loadContractorMatchProfile(
  supabase: SupabaseClient,
  contractorId: string,
): Promise<ContractorMatchProfile> {
  const [{ data: cp }, quals] = await Promise.all([
    supabase
      .from("contractor_profiles")
      .select(
        "service_postal_code, service_municipality, max_travel_km, refrigerant_license, electrical_qualification, lvi_qualifications",
      )
      .eq("id", contractorId)
      .maybeSingle(),
    import("@/lib/save-contractor-qualifications").then((m) =>
      m.getContractorQualifications(contractorId),
    ),
  ]);

  return {
    tradeIds: quals.tradeIds,
    tradeSlugs: quals.tradeSlugs,
    jobTypeIds: quals.jobTypeIds,
    jobTypeSlugs: quals.jobTypeSlugs,
    refrigerantLicense: quals.refrigerantLicense,
    electricalQualification: quals.electricalQualification,
    lviQualifications: quals.lviQualifications,
    servicePostalCode: cp?.service_postal_code ?? null,
    serviceMunicipality: cp?.service_municipality ?? null,
    maxTravelKm: cp?.max_travel_km ?? 100,
  };
}
