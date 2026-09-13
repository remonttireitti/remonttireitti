import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMissingColumnError } from "@/lib/bid-save-persist";

export type ProjectCompletionRequestRow = {
  id: string;
  project_id: string;
  contractor_id: string;
  criterion_ids: string[];
  gap_types: string[];
  note: string | null;
  suggest_template: boolean;
  preliminary_min_cents: number | null;
  preliminary_max_cents: number | null;
  preliminary_note: string | null;
  resolved_at: string | null;
  created_at: string;
  contractorCompany?: string | null;
};

export const COMPLETION_REQUESTS_SQL_HINT =
  "supabase/PRODUCTION_APPLY_COMPLETION_REQUESTS.sql";

const V2_INSERT_COLUMNS = [
  "gap_types",
  "suggest_template",
  "preliminary_min_cents",
  "preliminary_max_cents",
  "preliminary_note",
] as const;

const FULL_SELECT =
  "id, project_id, contractor_id, criterion_ids, gap_types, note, suggest_template, preliminary_min_cents, preliminary_max_cents, preliminary_note, resolved_at, created_at";

const LEGACY_SELECT =
  "id, project_id, contractor_id, criterion_ids, note, resolved_at, created_at";

export type CompletionRequestInsertRow = {
  project_id: string;
  contractor_id: string;
  criterion_ids: string[];
  gap_types: string[];
  note: string;
  suggest_template: boolean;
  preliminary_min_cents: number | null;
  preliminary_max_cents: number | null;
  preliminary_note: string | null;
  message_id: string | null;
};

function isMissingTableError(error: { code?: string; message?: string }): boolean {
  const code = error.code ?? "";
  const msg = (error.message ?? "").toLowerCase();
  return (
    code === "42P01" ||
    (msg.includes("project_completion_requests") &&
      (msg.includes("does not exist") || msg.includes("schema cache")))
  );
}

export function completionRequestInsertErrorMessage(error: {
  code?: string;
  message?: string;
}): string {
  if (isMissingTableError(error)) {
    return `Täydennyspyyntöjen taulu puuttuu tietokannasta. Aja Supabase SQL Editorissa ${COMPLETION_REQUESTS_SQL_HINT} ja yritä uudelleen.`;
  }
  if (isMissingColumnError(error)) {
    return `Täydennyspyyntöjen sarakkeet puuttuvat tietokannasta. Aja Supabase SQL Editorissa ${COMPLETION_REQUESTS_SQL_HINT} ja yritä uudelleen.`;
  }
  return "Täydennyspyynnön tallennus epäonnistui.";
}

function stripV2InsertColumns(
  row: CompletionRequestInsertRow,
): Record<string, unknown> {
  const copy = { ...row } as Record<string, unknown>;
  for (const key of V2_INSERT_COLUMNS) {
    delete copy[key];
  }
  return copy;
}

export function tryCreateAdminClient(): SupabaseClient | null {
  try {
    return createAdminClient();
  } catch (err) {
    console.warn("[tryCreateAdminClient]", err);
    return null;
  }
}

export async function insertCompletionRequestRow(
  supabase: SupabaseClient,
  row: CompletionRequestInsertRow,
): Promise<{ error: { code?: string; message?: string } | null }> {
  const first = await supabase.from("project_completion_requests").insert(row);
  if (!first.error || !isMissingColumnError(first.error)) {
    return first;
  }

  console.warn(
    "[insertCompletionRequestRow] v2 columns missing — retrying legacy insert:",
    first.error.message,
  );
  return supabase.from("project_completion_requests").insert(stripV2InsertColumns(row));
}

export async function persistCompletionRequest(
  primary: SupabaseClient,
  row: CompletionRequestInsertRow,
): Promise<{ error: { code?: string; message?: string } | null }> {
  const first = await insertCompletionRequestRow(primary, row);
  if (!first.error) return first;

  const admin = tryCreateAdminClient();
  if (!admin || admin === primary) return first;

  console.warn(
    "[persistCompletionRequest] primary insert failed — retrying with admin:",
    first.error.message,
  );
  return insertCompletionRequestRow(admin, row);
}

function mapCompletionRequestRow(
  data: Record<string, unknown>,
): ProjectCompletionRequestRow {
  return {
    id: data.id as string,
    project_id: data.project_id as string,
    contractor_id: data.contractor_id as string,
    criterion_ids: (data.criterion_ids as string[] | null) ?? [],
    gap_types: (data.gap_types as string[] | null) ?? [],
    note: (data.note as string | null) ?? null,
    suggest_template: (data.suggest_template as boolean) ?? false,
    preliminary_min_cents: (data.preliminary_min_cents as number | null) ?? null,
    preliminary_max_cents: (data.preliminary_max_cents as number | null) ?? null,
    preliminary_note: (data.preliminary_note as string | null) ?? null,
    resolved_at: (data.resolved_at as string | null) ?? null,
    created_at: data.created_at as string,
  };
}

function mapCompletionRequestRows(
  data: unknown[] | null,
): ProjectCompletionRequestRow[] {
  return (data ?? []).map((row) =>
    mapCompletionRequestRow(row as Record<string, unknown>),
  );
}

export async function fetchOpenCompletionRequests(
  supabase: SupabaseClient,
  projectId: string,
): Promise<ProjectCompletionRequestRow[]> {
  const { data, error } = await supabase
    .from("project_completion_requests")
    .select(FULL_SELECT)
    .eq("project_id", projectId)
    .is("resolved_at", null)
    .order("created_at", { ascending: false });

  if (!error) return mapCompletionRequestRows(data);
  if (!isMissingColumnError(error) && !isMissingTableError(error)) {
    console.error("[fetchOpenCompletionRequests]", error.message);
    return [];
  }

  const legacy = await supabase
    .from("project_completion_requests")
    .select(LEGACY_SELECT)
    .eq("project_id", projectId)
    .is("resolved_at", null)
    .order("created_at", { ascending: false });

  if (legacy.error) {
    console.error("[fetchOpenCompletionRequests]", legacy.error.message);
    return [];
  }

  return mapCompletionRequestRows(legacy.data);
}

export async function fetchContractorOpenCompletionRequest(
  supabase: SupabaseClient,
  projectId: string,
  contractorId: string,
): Promise<ProjectCompletionRequestRow | null> {
  const { data, error } = await supabase
    .from("project_completion_requests")
    .select(FULL_SELECT)
    .eq("project_id", projectId)
    .eq("contractor_id", contractorId)
    .is("resolved_at", null)
    .order("created_at", { ascending: false })
    .limit(1);

  if (!error) return mapCompletionRequestRows(data)[0] ?? null;
  if (!isMissingColumnError(error) && !isMissingTableError(error)) {
    console.error("[fetchContractorOpenCompletionRequest]", error.message);
    return null;
  }

  const legacy = await supabase
    .from("project_completion_requests")
    .select(LEGACY_SELECT)
    .eq("project_id", projectId)
    .eq("contractor_id", contractorId)
    .is("resolved_at", null)
    .order("created_at", { ascending: false })
    .limit(1);

  if (legacy.error) {
    console.error("[fetchContractorOpenCompletionRequest]", legacy.error.message);
    return null;
  }

  return mapCompletionRequestRows(legacy.data)[0] ?? null;
}

export async function incrementCompletionTemplateStats(
  supabase: SupabaseClient,
  params: {
    jobSlug: string;
    criterionIds: string[];
    gapTypes: string[];
    asSuggestion: boolean;
  },
): Promise<void> {
  const jobSlug = params.jobSlug || "generic";

  try {
    if (params.criterionIds.length > 0) {
      const { error } = await supabase.rpc("increment_template_criterion_stats", {
        p_job_slug: jobSlug,
        p_criterion_ids: params.criterionIds,
        p_as_suggestion: params.asSuggestion,
      });

      if (error) {
        await supabase.rpc("increment_template_criterion_stats", {
          p_job_slug: jobSlug,
          p_criterion_ids: params.criterionIds,
        });
      }
    }

    if (params.gapTypes.length > 0) {
      const { error } = await supabase.rpc("increment_template_gap_stats", {
        p_job_slug: jobSlug,
        p_gap_types: params.gapTypes,
        p_as_suggestion: params.asSuggestion,
      });

      if (error) {
        const gapCriterionIds = params.gapTypes.map((gap) => `gap:${gap}`);
        await supabase.rpc("increment_template_criterion_stats", {
          p_job_slug: jobSlug,
          p_criterion_ids: gapCriterionIds,
        });
      }
    }
  } catch (err) {
    console.warn("[incrementCompletionTemplateStats]", err);
  }
}
