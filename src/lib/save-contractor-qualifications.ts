import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type {
  ElectricalQualification,
  LviQualification,
  RefrigerantLicense,
} from "@/types/contractor";
import type { SupabaseClient } from "@supabase/supabase-js";

type SaveInput = {
  contractorId: string;
  companyName: string;
  tradeIds: string[];
  jobTypeIds: string[];
  refrigerantLicense: RefrigerantLicense | null;
  electricalQualification: ElectricalQualification | null;
  lviQualifications: LviQualification[];
};

async function dbClient(): Promise<SupabaseClient> {
  try {
    return createAdminClient();
  } catch {
    return await createClient();
  }
}

export async function saveContractorQualifications(
  input: SaveInput,
): Promise<{ error?: string }> {
  const db = await dbClient();

  const { error: cpErr } = await db.from("contractor_profiles").upsert({
    id: input.contractorId,
    company_name: input.companyName,
    refrigerant_license: input.refrigerantLicense,
    electrical_qualification: input.electricalQualification,
    lvi_qualifications: input.lviQualifications,
  });

  if (cpErr) return { error: cpErr.message };

  await db
    .from("contractor_job_types")
    .delete()
    .eq("contractor_id", input.contractorId);

  if (input.jobTypeIds.length > 0) {
    const { error: jtErr } = await db.from("contractor_job_types").insert(
      input.jobTypeIds.map((job_type_id) => ({
        contractor_id: input.contractorId,
        job_type_id,
      })),
    );
    if (jtErr) return { error: jtErr.message };
  }

  const tradeIdSet = new Set(input.tradeIds);

  if (input.jobTypeIds.length > 0) {
    const { data: links } = await db
      .from("job_type_trades")
      .select("trade_id")
      .in("job_type_id", input.jobTypeIds);

    for (const link of links ?? []) {
      tradeIdSet.add(link.trade_id as string);
    }
  }

  await db
    .from("contractor_trades")
    .delete()
    .eq("contractor_id", input.contractorId);

  if (tradeIdSet.size > 0) {
    const { error: trErr } = await db.from("contractor_trades").insert(
      [...tradeIdSet].map((trade_id) => ({
        contractor_id: input.contractorId,
        trade_id,
      })),
    );
    if (trErr) return { error: trErr.message };
  }

  return {};
}

export async function getContractorQualifications(contractorId: string) {
  const db = await dbClient();

  const { data: cp } = await db
    .from("contractor_profiles")
    .select(
      "company_name, refrigerant_license, electrical_qualification, lvi_qualifications",
    )
    .eq("id", contractorId)
    .maybeSingle();

  const { data: jts } = await db
    .from("contractor_job_types")
    .select("job_type_id")
    .eq("contractor_id", contractorId);

  const jobTypeIds = (jts ?? []).map((r) => r.job_type_id);

  let jobTypeSlugs: string[] = [];
  if (jobTypeIds.length > 0) {
    const { data: types } = await db
      .from("job_types")
      .select("slug")
      .in("id", jobTypeIds);
    jobTypeSlugs = (types ?? []).map((t) => t.slug);
  }

  const { data: trRows } = await db
    .from("contractor_trades")
    .select("trade_id")
    .eq("contractor_id", contractorId);

  const tradeIds = (trRows ?? []).map((r) => r.trade_id as string);

  let tradeSlugs: string[] = [];
  let tradeNames: string[] = [];
  if (tradeIds.length > 0) {
    const { data: trades } = await db
      .from("trades")
      .select("slug, name_fi")
      .in("id", tradeIds)
      .order("sort_order");
    tradeSlugs = (trades ?? []).map((t) => t.slug);
    tradeNames = (trades ?? []).map((t) => t.name_fi);
  }

  return {
    companyName: cp?.company_name ?? "",
    refrigerantLicense: cp?.refrigerant_license ?? null,
    electricalQualification: cp?.electrical_qualification ?? null,
    lviQualifications: (cp?.lvi_qualifications ?? []) as LviQualification[],
    jobTypeIds,
    jobTypeSlugs,
    tradeIds,
    tradeSlugs,
    tradeNames,
  };
}
