import { MAINTENANCE_JOB_SLUGS } from "@/constants/maintenance";
import {
  PUBLIC_PROJECT_JOB_SLUGS,
} from "@/constants/project-areas";
import { HEAT_PUMP_JOB_SLUGS } from "@/constants/heat-pumps";
import { createClient } from "@/lib/supabase/server";
import {
  buildJobCatalog,
  type JobCatalog,
  type JobType,
  type JobTypeTradeLink,
  type Trade,
} from "@/types/job-catalog";

/** Lämpöpumppu-MVP: ilma-, vesi-ilmalämpö- ja maalämpöpumppu. */
export async function fetchMaintenanceCatalog(): Promise<JobCatalog> {
  const catalog = await fetchJobCatalog();
  const allowed = new Set<string>(MAINTENANCE_JOB_SLUGS);
  return {
    ...catalog,
    jobTypes: catalog.jobTypes.filter((jt) => allowed.has(jt.slug)),
  };
}

export async function fetchHeatPumpCatalog(): Promise<JobCatalog> {
  const catalog = await fetchJobCatalog();
  const allowed = new Set<string>(HEAT_PUMP_JOB_SLUGS);
  const order = new Map<string, number>(
    HEAT_PUMP_JOB_SLUGS.map((s, i) => [s, i]),
  );
  return {
    ...catalog,
    jobTypes: catalog.jobTypes
      .filter((jt) => allowed.has(jt.slug))
      .sort((a, b) => (order.get(a.slug) ?? 99) - (order.get(b.slug) ?? 99)),
  };
}

/** Julkinen remonttivalikoima — talon osittain, kysytyimmät työt ensin. */
export async function fetchProjectCatalog(): Promise<JobCatalog> {
  const catalog = await fetchJobCatalog();
  const allowed = new Set<string>(PUBLIC_PROJECT_JOB_SLUGS);
  const order = new Map<string, number>(
    PUBLIC_PROJECT_JOB_SLUGS.map((s, i) => [s, i]),
  );
  return {
    ...catalog,
    jobTypes: catalog.jobTypes
      .filter((jt) => allowed.has(jt.slug))
      .sort((a, b) => (order.get(a.slug) ?? 99) - (order.get(b.slug) ?? 99)),
  };
}

export async function fetchJobCatalog(): Promise<JobCatalog> {
  const supabase = await createClient();

  const [tradesRes, jobTypesRes, linksRes] = await Promise.all([
    supabase
      .from("trades")
      .select("id, slug, name_fi, description_fi, sort_order")
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("job_types")
      .select(
        "id, slug, name_fi, description_fi, search_keywords, legacy_category_id, sort_order",
      )
      .eq("is_active", true)
      .order("sort_order"),
    supabase.from("job_type_trades").select("job_type_id, trade_id, is_required"),
  ]);

  return buildJobCatalog(
    (tradesRes.data ?? []) as Trade[],
    (jobTypesRes.data ?? []) as JobType[],
    (linksRes.data ?? []) as JobTypeTradeLink[],
  );
}
