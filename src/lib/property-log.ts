import type { SupabaseClient } from "@supabase/supabase-js";
import { bidResolvedAmountCents, type BidAmountParts } from "@/lib/bid-accept-scope";
import { getBidContractorName } from "@/lib/bids";
import {
  parsePropertyDetails,
  type PropertyBuildingType,
  type PropertyDetails,
} from "@/lib/property-profile";

export type PropertyRow = {
  id: string;
  address_line: string;
  postal_code: string;
  municipality: string;
  label: string | null;
  property_type: PropertyBuildingType | null;
  built_year: number | null;
  floor_area_m2: number | null;
  notes: string | null;
  details: PropertyDetails;
};

const PROPERTY_SELECT = `
  id,
  address_line,
  postal_code,
  municipality,
  label,
  property_type,
  built_year,
  floor_area_m2,
  notes,
  details
` as const;

function mapPropertyRow(raw: Record<string, unknown>): PropertyRow {
  return {
    id: raw.id as string,
    address_line: (raw.address_line as string) ?? "",
    postal_code: raw.postal_code as string,
    municipality: raw.municipality as string,
    label: (raw.label as string | null) ?? null,
    property_type: (raw.property_type as PropertyBuildingType | null) ?? null,
    built_year: (raw.built_year as number | null) ?? null,
    floor_area_m2:
      raw.floor_area_m2 != null ? Number(raw.floor_area_m2) : null,
    notes: (raw.notes as string | null) ?? null,
    details: parsePropertyDetails(raw.details),
  };
}

export type PropertyLogEntryRow = {
  id: string;
  property_id: string;
  source: "platform" | "manual";
  title: string;
  description: string | null;
  performed_at: string;
  contractor_name: string | null;
  amount_cents: number | null;
  project_id: string | null;
  created_at: string;
};

function normalizeAddressLine(value: string | null | undefined): string {
  return (value ?? "").trim();
}

export function formatPropertyAddress(property: {
  address_line: string;
  postal_code: string;
  municipality: string;
}): string {
  const line = normalizeAddressLine(property.address_line);
  const base = `${property.postal_code} ${property.municipality}`;
  return line ? `${line}, ${base}` : base;
}

async function findOrCreateProperty(
  supabase: SupabaseClient,
  customerId: string,
  project: {
    address_line: string | null;
    postal_code: string;
    municipality: string;
  },
): Promise<string | null> {
  const addressLine = normalizeAddressLine(project.address_line);

  const { data: existing } = await supabase
    .from("properties")
    .select("id")
    .eq("customer_id", customerId)
    .eq("postal_code", project.postal_code.trim())
    .eq("municipality", project.municipality.trim())
    .eq("address_line", addressLine)
    .maybeSingle();

  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from("properties")
    .insert({
      customer_id: customerId,
      address_line: addressLine,
      postal_code: project.postal_code.trim(),
      municipality: project.municipality.trim(),
      label: addressLine || null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[findOrCreateProperty]", error.message);
    return null;
  }

  return created.id;
}

/** Luo tai päivittää huoltokirjamerkinnän valmistuneesta urakasta. */
export async function syncPropertyLogFromCompletedProject(
  supabase: SupabaseClient,
  projectId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select(
      `
      id,
      customer_id,
      title,
      description,
      status,
      completed_at,
      completion_notes,
      address_line,
      postal_code,
      municipality,
      accepted_bid_id
    `,
    )
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    return { ok: false, error: "project_not_found" };
  }

  if (project.status !== "completed") {
    return { ok: false, error: "project_not_completed" };
  }

  const propertyId = await findOrCreateProperty(supabase, project.customer_id, {
    address_line: project.address_line,
    postal_code: project.postal_code,
    municipality: project.municipality,
  });

  if (!propertyId) {
    return { ok: false, error: "property_create_failed" };
  }

  let contractorName: string | null = null;
  let amountCents: number | null = null;
  let bidId: string | null = null;

  if (project.accepted_bid_id) {
    const { data: bid } = await supabase
      .from("bids")
      .select(
        `
        id,
        amount_cents,
        offers_equipment,
        equipment_amount_cents,
        accepted_includes_equipment,
        contractor_profiles ( company_name )
      `,
      )
      .eq("id", project.accepted_bid_id)
      .maybeSingle();

    if (bid) {
      bidId = bid.id;
      contractorName = getBidContractorName(
        bid.contractor_profiles as
          | { company_name: string }
          | { company_name: string }[]
          | null,
      );
      amountCents = bidResolvedAmountCents(bid as BidAmountParts);
    }
  }

  const performedAt = project.completed_at
    ? project.completed_at.slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  const description =
    (project.completion_notes?.trim() || project.description?.trim() || "").slice(
      0,
      2000,
    ) || null;

  const { data: existingEntry } = await supabase
    .from("property_log_entries")
    .select("id")
    .eq("project_id", projectId)
    .maybeSingle();

  const payload = {
    property_id: propertyId,
    customer_id: project.customer_id,
    source: "platform" as const,
    title: project.title,
    description,
    performed_at: performedAt,
    contractor_name: contractorName,
    amount_cents: amountCents,
    project_id: projectId,
    bid_id: bidId,
  };

  if (existingEntry) {
    const { error } = await supabase
      .from("property_log_entries")
      .update(payload)
      .eq("id", existingEntry.id);

    if (error) {
      console.error("[syncPropertyLog] update:", error.message);
      return { ok: false, error: "entry_update_failed" };
    }
  } else {
    const { error } = await supabase.from("property_log_entries").insert(payload);

    if (error) {
      console.error("[syncPropertyLog] insert:", error.message);
      return { ok: false, error: "entry_insert_failed" };
    }
  }

  return { ok: true };
}

/** Täydentää puuttuvat merkinnät aiemmista valmiista urakoista. */
export async function backfillPropertyLogsForCustomer(
  supabase: SupabaseClient,
  customerId: string,
): Promise<number> {
  const { data: completedProjects } = await supabase
    .from("projects")
    .select("id")
    .eq("customer_id", customerId)
    .eq("status", "completed");

  if (!completedProjects?.length) return 0;

  const projectIds = completedProjects.map((p) => p.id);
  const { data: existingEntries } = await supabase
    .from("property_log_entries")
    .select("project_id")
    .in("project_id", projectIds);

  const syncedIds = new Set(
    (existingEntries ?? [])
      .map((e) => e.project_id)
      .filter((id): id is string => Boolean(id)),
  );

  let count = 0;
  for (const project of completedProjects) {
    if (syncedIds.has(project.id)) continue;
    const result = await syncPropertyLogFromCompletedProject(supabase, project.id);
    if (result.ok) count += 1;
  }

  return count;
}

export async function countCustomerPropertyStats(
  supabase: SupabaseClient,
  customerId: string,
): Promise<{ propertyCount: number; logEntryCount: number }> {
  const { count: propertyCount } = await supabase
    .from("properties")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", customerId);

  const { data: propertyIds } = await supabase
    .from("properties")
    .select("id")
    .eq("customer_id", customerId);

  let logEntryCount = 0;
  if (propertyIds?.length) {
    const { count } = await supabase
      .from("property_log_entries")
      .select("id", { count: "exact", head: true })
      .in(
        "property_id",
        propertyIds.map((p) => p.id),
      );
    logEntryCount = count ?? 0;
  }

  return { propertyCount: propertyCount ?? 0, logEntryCount };
}

export async function fetchCustomerPropertyLog(
  supabase: SupabaseClient,
  customerId: string,
): Promise<
  {
    property: PropertyRow;
    entries: PropertyLogEntryRow[];
  }[]
> {
  const { data: properties } = await supabase
    .from("properties")
    .select(PROPERTY_SELECT)
    .eq("customer_id", customerId)
    .order("municipality")
    .order("postal_code");

  if (!properties?.length) return [];

  const propertyIds = properties.map((p) => p.id);
  const { data: entries } = await supabase
    .from("property_log_entries")
    .select(
      "id, property_id, source, title, description, performed_at, contractor_name, amount_cents, project_id, created_at",
    )
    .in("property_id", propertyIds)
    .order("performed_at", { ascending: false });

  const entriesByProperty = new Map<string, PropertyLogEntryRow[]>();
  for (const entry of entries ?? []) {
    const list = entriesByProperty.get(entry.property_id) ?? [];
    list.push(entry as PropertyLogEntryRow);
    entriesByProperty.set(entry.property_id, list);
  }

  return properties.map((property) => ({
    property: mapPropertyRow(property as Record<string, unknown>),
    entries: entriesByProperty.get(property.id) ?? [],
  }));
}

export async function fetchPropertyById(
  supabase: SupabaseClient,
  propertyId: string,
  customerId: string,
): Promise<{ property: PropertyRow; entries: PropertyLogEntryRow[] } | null> {
  const { data: property } = await supabase
    .from("properties")
    .select(PROPERTY_SELECT)
    .eq("id", propertyId)
    .eq("customer_id", customerId)
    .maybeSingle();

  if (!property) return null;

  const { data: entries } = await supabase
    .from("property_log_entries")
    .select(
      "id, property_id, source, title, description, performed_at, contractor_name, amount_cents, project_id, created_at",
    )
    .eq("property_id", propertyId)
    .order("performed_at", { ascending: false });

  return {
    property: mapPropertyRow(property as Record<string, unknown>),
    entries: (entries ?? []) as PropertyLogEntryRow[],
  };
}
