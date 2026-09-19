import { createAdminClient } from "@/lib/supabase/admin";
import { contractorLogoSignedUrl } from "@/lib/contractor-branding";
import type { ContractorMarketSignals } from "@/lib/contractor-market-profile";
import { fetchContractorMarketSignalsForOne } from "@/lib/contractor-market-profile-server";
import { getContractorQualifications } from "@/lib/save-contractor-qualifications";
import type { ContractorRatingSummary } from "@/lib/reviews";

export type PublicContractorReview = {
  id: string;
  rating: number;
  body: string | null;
  would_recommend: boolean | null;
  created_at: string;
  project_title: string;
};

export type PublicContractorProfile = {
  id: string;
  company_name: string;
  description: string | null;
  logo_url: string | null;
  website_url: string | null;
  years_in_business: number | null;
  employee_count: number | null;
  founded_year: number | null;
  company_size_band: string | null;
  verification_status: "pending" | "verified" | "rejected";
  service_municipality: string | null;
  max_travel_km: number | null;
  rating: ContractorRatingSummary | null;
  completed_jobs: number;
  market_signals: ContractorMarketSignals;
  reviews: PublicContractorReview[];
  qualifications: Awaited<ReturnType<typeof getContractorQualifications>>;
};

function adminConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

export async function fetchPublicContractorProfile(
  contractorId: string,
): Promise<PublicContractorProfile | null> {
  if (!adminConfigured()) return null;

  const admin = createAdminClient();

  const { data: cp, error } = await admin
    .from("contractor_profiles")
    .select(
      "id, company_name, description, logo_storage_path, website_url, years_in_business, employee_count, founded_year, company_size_band, verification_status, service_municipality, max_travel_km",
    )
    .eq("id", contractorId)
    .maybeSingle();

  if (error || !cp) {
    if (error) console.error("[public-contractor]", error.message);
    return null;
  }

  const [qualifications, reviewsRes, completedRes, ratingsRes, marketSignals] =
    await Promise.all([
      getContractorQualifications(contractorId),
      admin
        .from("reviews")
        .select(
          "id, rating, body, would_recommend, created_at, projects ( title )",
        )
        .eq("contractor_id", contractorId)
        .order("created_at", { ascending: false })
        .limit(20),
      admin
        .from("bids")
        .select("id", { count: "exact", head: true })
        .eq("contractor_id", contractorId)
        .eq("status", "accepted"),
      admin
        .from("reviews")
        .select("rating")
        .eq("contractor_id", contractorId),
      fetchContractorMarketSignalsForOne(admin, contractorId),
    ]);

  const ratings = (ratingsRes.data ?? []).map((r) => r.rating as number);
  const rating: ContractorRatingSummary | null =
    ratings.length > 0
      ? {
          average: ratings.reduce((a, b) => a + b, 0) / ratings.length,
          count: ratings.length,
        }
      : null;

  const reviews: PublicContractorReview[] = (reviewsRes.data ?? []).map(
    (row) => {
      const projects = row.projects as
        | { title: string }
        | { title: string }[]
        | null;
      const title = Array.isArray(projects)
        ? (projects[0]?.title ?? "Urakka")
        : (projects?.title ?? "Urakka");
      return {
        id: row.id as string,
        rating: row.rating as number,
        body: row.body as string | null,
        would_recommend: row.would_recommend as boolean | null,
        created_at: row.created_at as string,
        project_title: title,
      };
    },
  );

  const logoUrl = await contractorLogoSignedUrl(
    admin,
    cp.logo_storage_path as string | null,
    60 * 60 * 24,
  );

  return {
    id: cp.id,
    company_name: cp.company_name,
    description: cp.description,
    logo_url: logoUrl,
    website_url: cp.website_url,
    years_in_business: cp.years_in_business,
    employee_count: cp.employee_count,
    founded_year: cp.founded_year,
    company_size_band: cp.company_size_band,
    verification_status: cp.verification_status,
    service_municipality: cp.service_municipality,
    max_travel_km: cp.max_travel_km,
    rating,
    completed_jobs: completedRes.count ?? 0,
    market_signals: marketSignals,
    reviews,
    qualifications,
  };
}
