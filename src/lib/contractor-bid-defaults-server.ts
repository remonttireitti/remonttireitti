import { HEAT_PUMP_MARKETING } from "@/constants/heat-pumps";
import { createClient } from "@/lib/supabase/server";
import { getContractorQualifications } from "@/lib/save-contractor-qualifications";
import {
  allowedBidDefaultsKeys,
  buildBidDefaultsTabs,
  emptyBidDefaults,
  parseBidDefaultsByJobType,
  resolveBidDefaultsForJobType,
  type BidDefaultsTab,
  type ContractorBidDefaults,
  type ContractorBidDefaultsByJobType,
} from "@/lib/contractor-bid-defaults-shared";

export type ContractorBidDefaultsBundle = {
  legacy: ContractorBidDefaults;
  byJobType: ContractorBidDefaultsByJobType;
  tabs: BidDefaultsTab[];
};

const emptyLegacy = emptyBidDefaults();

async function tradeSlugsForJobType(
  contractorId: string,
  jobTypeSlug: string,
): Promise<string[]> {
  const supabase = await createClient();
  const { data: jt } = await supabase
    .from("job_types")
    .select("id")
    .eq("slug", jobTypeSlug)
    .maybeSingle();

  if (!jt?.id) return [];

  const [{ data: links }, { data: contractorTrades }] = await Promise.all([
    supabase
      .from("job_type_trades")
      .select("trade_id, trades ( slug )")
      .eq("job_type_id", jt.id),
    supabase
      .from("contractor_trades")
      .select("trade_id")
      .eq("contractor_id", contractorId),
  ]);

  const contractorTradeIds = new Set(
    (contractorTrades ?? []).map((row) => row.trade_id as string),
  );

  const slugs: string[] = [];
  for (const link of links ?? []) {
    if (!contractorTradeIds.has(link.trade_id as string)) continue;
    const trades = link.trades as { slug: string } | { slug: string }[] | null;
    const slug = Array.isArray(trades) ? trades[0]?.slug : trades?.slug;
    if (slug) slugs.push(slug);
  }

  return slugs;
}

export async function fetchContractorBidDefaultsBundle(
  contractorId: string,
): Promise<ContractorBidDefaultsBundle> {
  const supabase = await createClient();
  const [quals, { data }] = await Promise.all([
    getContractorQualifications(contractorId),
    supabase
      .from("contractor_profiles")
      .select(
        "default_bid_scope_terms, default_bid_contract_terms, default_bid_warranty_work, default_bid_warranty_equipment, default_bid_terms_by_job_type",
      )
      .eq("id", contractorId)
      .maybeSingle(),
  ]);

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

  if (!data) {
    return { legacy: emptyLegacy, byJobType: {}, tabs };
  }

  const legacy: ContractorBidDefaults = {
    scope_terms: data.default_bid_scope_terms ?? "",
    contract_terms: data.default_bid_contract_terms ?? "",
    warranty_work: data.default_bid_warranty_work ?? "",
    warranty_equipment: data.default_bid_warranty_equipment ?? "",
  };

  return {
    legacy,
    byJobType: parseBidDefaultsByJobType(
      data.default_bid_terms_by_job_type,
      allowedBidDefaultsKeys(tabs),
    ),
    tabs,
  };
}

/** Oletusehdot yhdelle tarjouspyynnölle (työlaji + ammatit + vanhat yhteiset sarakkeet). */
export async function fetchContractorBidDefaults(
  contractorId: string,
  jobTypeSlug?: string | null,
): Promise<ContractorBidDefaults> {
  const bundle = await fetchContractorBidDefaultsBundle(contractorId);
  const tradeSlugs =
    jobTypeSlug != null
      ? await tradeSlugsForJobType(contractorId, jobTypeSlug)
      : [];

  return resolveBidDefaultsForJobType(
    bundle.byJobType,
    bundle.legacy,
    jobTypeSlug,
    tradeSlugs,
  );
}
