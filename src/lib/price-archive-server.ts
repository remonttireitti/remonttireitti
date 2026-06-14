import { bidResolvedAmountCents } from "@/lib/bid-accept-scope";
import {
  medianCents,
  postalRegionPrefix,
  PRICE_ARCHIVE_JOB_SLUGS,
  PRICE_ARCHIVE_MIN_SAMPLES,
  priceArchiveJobLabel,
  type PriceArchiveStat,
} from "@/lib/price-archive";
import { createAdminClient } from "@/lib/supabase/admin";

type RawRow = {
  municipality: string;
  postal_code: string;
  jobSlug: string;
  jobName: string;
  amountCents: number;
};

const ACCEPTED_STATUSES = ["bid_accepted", "in_progress", "completed"] as const;

async function fetchRawPriceRows(): Promise<RawRow[]> {
  const admin = createAdminClient();

  const { data: projects } = await admin
    .from("projects")
    .select("id, municipality, postal_code, accepted_bid_id, job_type_id, status")
    .in("status", [...ACCEPTED_STATUSES])
    .not("accepted_bid_id", "is", null);

  if (!projects?.length) return [];

  const jobTypeIds = [...new Set(projects.map((p) => p.job_type_id).filter(Boolean))];
  const bidIds = [...new Set(projects.map((p) => p.accepted_bid_id).filter(Boolean))];

  const [{ data: jobTypes }, { data: bids }] = await Promise.all([
    admin
      .from("job_types")
      .select("id, slug, name_fi")
      .in("id", jobTypeIds),
    admin
      .from("bids")
      .select(
        "id, amount_cents, offers_equipment, equipment_amount_cents, accepted_includes_equipment",
      )
      .in("id", bidIds),
  ]);

  const jobById = new Map((jobTypes ?? []).map((j) => [j.id, j]));
  const bidById = new Map((bids ?? []).map((b) => [b.id, b]));
  const allowedSlugs = new Set<string>(PRICE_ARCHIVE_JOB_SLUGS);

  const rows: RawRow[] = [];

  for (const project of projects) {
    const job = jobById.get(project.job_type_id);
    const bid = bidById.get(project.accepted_bid_id!);
    if (!job || !bid || !allowedSlugs.has(job.slug)) continue;

    const amountCents = bidResolvedAmountCents({
      amount_cents: bid.amount_cents,
      offers_equipment: bid.offers_equipment,
      equipment_amount_cents: bid.equipment_amount_cents,
      accepted_includes_equipment: bid.accepted_includes_equipment,
    });

    if (amountCents <= 0) continue;

    rows.push({
      municipality: project.municipality?.trim() ?? "",
      postal_code: project.postal_code?.trim() ?? "",
      jobSlug: job.slug,
      jobName: job.name_fi,
      amountCents,
    });
  }

  return rows;
}

function aggregateRows(
  rows: RawRow[],
  regionLabel: string | null,
): PriceArchiveStat[] {
  const byJob = new Map<string, { jobName: string; amounts: number[] }>();

  for (const row of rows) {
    const bucket = byJob.get(row.jobSlug) ?? {
      jobName: row.jobName,
      amounts: [],
    };
    bucket.amounts.push(row.amountCents);
    byJob.set(row.jobSlug, bucket);
  }

  return [...byJob.entries()]
    .map(([jobSlug, { jobName, amounts }]) => ({
      jobSlug,
      jobName: priceArchiveJobLabel(jobSlug, jobName),
      sampleCount: amounts.length,
      medianCents: medianCents(amounts),
      minCents: Math.min(...amounts),
      maxCents: Math.max(...amounts),
      regionLabel,
    }))
    .filter((s) => s.sampleCount >= 1)
    .sort((a, b) => b.sampleCount - a.sampleCount);
}

function filterRowsByPostal(rows: RawRow[], postalFilter: string): RawRow[] {
  if (postalFilter.length === 5) {
    return rows.filter((r) => r.postal_code === postalFilter);
  }
  if (postalFilter.length >= 2) {
    const prefix = postalFilter.slice(0, 2);
    return rows.filter(
      (r) => postalRegionPrefix(r.postal_code) === prefix,
    );
  }
  return rows;
}

export type PriceArchivePageData = {
  national: PriceArchiveStat[];
  regional: PriceArchiveStat[] | null;
  regionLabel: string | null;
  totalSamples: number;
  selectedJob: PriceArchiveStat | null;
};

export async function fetchPriceArchivePageData(options: {
  jobSlug?: string | null;
  postalFilter?: string | null;
}): Promise<PriceArchivePageData> {
  const allRows = await fetchRawPriceRows();
  const national = aggregateRows(allRows, null);

  const postal = options.postalFilter?.trim() ?? "";
  let regional: PriceArchiveStat[] | null = null;
  let regionLabel: string | null = null;

  if (postal.length >= 2) {
    const filtered = filterRowsByPostal(allRows, postal);
    const stats = aggregateRows(
      filtered,
      postal.length === 5 ? `Postinumero ${postal}` : `Alue ${postal.slice(0, 2)}x`,
    );
    if (stats.some((s) => s.sampleCount >= PRICE_ARCHIVE_MIN_SAMPLES)) {
      regional = stats.filter((s) => s.sampleCount >= PRICE_ARCHIVE_MIN_SAMPLES);
      regionLabel =
        postal.length === 5
          ? `Postinumero ${postal}`
          : `Postinumeroalue ${postal.slice(0, 2)}x`;
    }
  }

  const selectedJob =
    options.jobSlug != null
      ? (regional?.find((s) => s.jobSlug === options.jobSlug) ??
        national.find((s) => s.jobSlug === options.jobSlug) ??
        null)
      : null;

  return {
    national,
    regional,
    regionLabel,
    totalSamples: allRows.length,
    selectedJob,
  };
}
