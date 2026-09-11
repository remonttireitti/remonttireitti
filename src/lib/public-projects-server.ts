import { createAdminClient } from "@/lib/supabase/admin";

export type PublicOpenProject = {
  id: string;
  title: string;
  summary: string;
  municipality: string;
  budget_min: number | null;
  budget_max: number | null;
  created_at: string;
  job_type_name: string | null;
  category_name: string;
  bid_count: number;
};

const SUMMARY_MAX_LENGTH = 180;

function truncateSummary(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= SUMMARY_MAX_LENGTH) return normalized;
  return `${normalized.slice(0, SUMMARY_MAX_LENGTH - 1).trimEnd()}…`;
}

function projectSummary(description: string | null, title: string): string {
  const body = description?.trim();
  if (body) return truncateSummary(body);
  return truncateSummary(title);
}

function adminClientConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

export async function fetchPublicOpenProjects(
  limit = 50,
): Promise<PublicOpenProject[]> {
  if (!adminClientConfigured()) return [];

  const admin = createAdminClient();

  const { data: projectsRaw, error } = await admin
    .from("projects")
    .select(
      `id, title, description, municipality, budget_min, budget_max, created_at,
       service_categories ( name_fi ),
       job_types ( name_fi )`,
    )
    .in("status", ["published", "receiving_bids"])
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[public-projects]", error.message);
    return [];
  }

  type RawRow = {
    id: string;
    title: string;
    description: string | null;
    municipality: string;
    budget_min: number | null;
    budget_max: number | null;
    created_at: string;
    service_categories: { name_fi: string } | { name_fi: string }[] | null;
    job_types: { name_fi: string } | { name_fi: string }[] | null;
  };

  const rows = (projectsRaw ?? []) as RawRow[];
  if (rows.length === 0) return [];

  const projectIds = rows.map((p) => p.id);
  const { data: bidRows } = await admin
    .from("bids")
    .select("project_id")
    .in("project_id", projectIds)
    .eq("status", "submitted");

  const bidCounts = new Map<string, number>();
  for (const row of bidRows ?? []) {
    bidCounts.set(row.project_id, (bidCounts.get(row.project_id) ?? 0) + 1);
  }

  return rows.map((p) => {
    const sc = p.service_categories;
    const jt = p.job_types;
    const categoryName = Array.isArray(sc)
      ? (sc[0]?.name_fi ?? "Remontti")
      : (sc?.name_fi ?? "Remontti");
    const jobTypeName = Array.isArray(jt) ? jt[0]?.name_fi : jt?.name_fi;

    return {
      id: p.id,
      title: p.title,
      summary: projectSummary(p.description, p.title),
      municipality: p.municipality,
      budget_min: p.budget_min,
      budget_max: p.budget_max,
      created_at: p.created_at,
      job_type_name: jobTypeName ?? null,
      category_name: categoryName,
      bid_count: bidCounts.get(p.id) ?? 0,
    };
  });
}

export async function fetchPublicOpenProject(
  id: string,
): Promise<PublicOpenProject | null> {
  if (!adminClientConfigured()) return null;

  const admin = createAdminClient();

  const { data: project, error } = await admin
    .from("projects")
    .select(
      `id, title, description, municipality, budget_min, budget_max, created_at,
       service_categories ( name_fi ),
       job_types ( name_fi )`,
    )
    .eq("id", id)
    .in("status", ["published", "receiving_bids"])
    .maybeSingle();

  if (error || !project) {
    if (error) console.error("[public-project]", error.message);
    return null;
  }

  const { count } = await admin
    .from("bids")
    .select("id", { count: "exact", head: true })
    .eq("project_id", id)
    .eq("status", "submitted");

  type RawRow = {
    id: string;
    title: string;
    description: string | null;
    municipality: string;
    budget_min: number | null;
    budget_max: number | null;
    created_at: string;
    service_categories: { name_fi: string } | { name_fi: string }[] | null;
    job_types: { name_fi: string } | { name_fi: string }[] | null;
  };

  const p = project as RawRow;
  const sc = p.service_categories;
  const jt = p.job_types;
  const categoryName = Array.isArray(sc)
    ? (sc[0]?.name_fi ?? "Remontti")
    : (sc?.name_fi ?? "Remontti");
  const jobTypeName = Array.isArray(jt) ? jt[0]?.name_fi : jt?.name_fi;

  return {
    id: p.id,
    title: p.title,
    summary: projectSummary(p.description, p.title),
    municipality: p.municipality,
    budget_min: p.budget_min,
    budget_max: p.budget_max,
    created_at: p.created_at,
    job_type_name: jobTypeName ?? null,
    category_name: categoryName,
    bid_count: count ?? 0,
  };
}
