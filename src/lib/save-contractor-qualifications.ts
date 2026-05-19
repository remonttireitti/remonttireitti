import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type {
  RefrigerantLicense,
  WorkCapability,
} from "@/types/contractor";
import type { SupabaseClient } from "@supabase/supabase-js";

type SaveInput = {
  contractorId: string;
  companyName: string;
  jobTypeIds: string[];
  refrigerantLicense: RefrigerantLicense;
  electricalCapability: WorkCapability;
  lviCapability: WorkCapability;
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
    electrical_capability: input.electricalCapability,
    lvi_capability: input.lviCapability,
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

    const { data: links } = await db
      .from("job_type_trades")
      .select("trade_id")
      .in("job_type_id", input.jobTypeIds);

    const tradeIds = [...new Set((links ?? []).map((l) => l.trade_id))];

    await db
      .from("contractor_trades")
      .delete()
      .eq("contractor_id", input.contractorId);

    if (tradeIds.length > 0) {
      await db.from("contractor_trades").insert(
        tradeIds.map((trade_id) => ({
          contractor_id: input.contractorId,
          trade_id,
        })),
      );
    }
  }

  return {};
}

export async function getContractorQualifications(contractorId: string) {
  const db = await dbClient();

  const { data: cp } = await db
    .from("contractor_profiles")
    .select(
      "company_name, refrigerant_license, electrical_capability, lvi_capability",
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

  return {
    companyName: cp?.company_name ?? "",
    refrigerantLicense: cp?.refrigerant_license ?? null,
    electricalCapability: cp?.electrical_capability ?? null,
    lviCapability: cp?.lvi_capability ?? null,
    jobTypeIds,
    jobTypeSlugs,
  };
}
