import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeFeedbackEmail } from "@/lib/platform-feedback-access";
import type { PlatformFeedbackGuestUsage } from "@/lib/platform-feedback-labels";

export type PlatformFeedbackRow = {
  id: string;
  user_id: string | null;
  guest_email: string | null;
  email_verified_at: string | null;
  role: "customer" | "contractor";
  context: "general" | "project_complete";
  project_id: string | null;
  clarity_rating: number;
  experience_rating: number;
  would_recommend: boolean;
  suggestions: string | null;
  guest_usage_context: PlatformFeedbackGuestUsage | null;
  created_at: string;
};

export type PlatformFeedbackAdminRow = PlatformFeedbackRow & {
  profiles: { full_name: string | null } | { full_name: string | null }[] | null;
  projects: { title: string } | { title: string }[] | null;
};

export type PublicFeedbackStats = {
  totalCount: number;
  avgClarity: number;
  avgExperience: number;
  recommendPct: number;
  customerCount: number;
  contractorCount: number;
};

const FEEDBACK_SELECT =
  "id, user_id, guest_email, email_verified_at, role, context, project_id, clarity_rating, experience_rating, would_recommend, suggestions, guest_usage_context, created_at";

function isVerifiedFeedback(row: {
  user_id: string | null;
  email_verified_at: string | null;
}): boolean {
  return Boolean(row.user_id || row.email_verified_at);
}

function countsTowardPublicStats(row: {
  user_id: string | null;
  email_verified_at: string | null;
  guest_usage_context: PlatformFeedbackGuestUsage | null;
}): boolean {
  if (!isVerifiedFeedback(row)) return false;
  return !row.guest_usage_context || row.guest_usage_context === "used_service";
}

export async function fetchPlatformFeedbackForProject(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
): Promise<PlatformFeedbackRow | null> {
  const { data } = await supabase
    .from("platform_feedback")
    .select(FEEDBACK_SELECT)
    .eq("user_id", userId)
    .eq("project_id", projectId)
    .maybeSingle();

  return data as PlatformFeedbackRow | null;
}

export async function fetchGeneralPlatformFeedbackForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<PlatformFeedbackRow | null> {
  const { data } = await supabase
    .from("platform_feedback")
    .select(FEEDBACK_SELECT)
    .eq("user_id", userId)
    .eq("context", "general")
    .is("project_id", null)
    .maybeSingle();

  return data as PlatformFeedbackRow | null;
}

export async function fetchGeneralPlatformFeedbackForEmail(
  email: string,
): Promise<PlatformFeedbackRow | null> {
  try {
    const admin = createAdminClient();
    const normalized = normalizeFeedbackEmail(email);
    const { data } = await admin
      .from("platform_feedback")
      .select(FEEDBACK_SELECT)
      .eq("context", "general")
      .is("project_id", null)
      .ilike("guest_email", normalized)
      .maybeSingle();

    return data as PlatformFeedbackRow | null;
  } catch {
    return null;
  }
}

export async function fetchPlatformFeedbackAdmin(
  supabase: SupabaseClient,
  limit = 200,
): Promise<PlatformFeedbackAdminRow[]> {
  const { data } = await supabase
    .from("platform_feedback")
    .select(
      `
      ${FEEDBACK_SELECT},
      profiles ( full_name ),
      projects ( title )
    `,
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []) as PlatformFeedbackAdminRow[];
}

export async function fetchPublicFeedbackStats(): Promise<PublicFeedbackStats | null> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("platform_feedback")
      .select(
        "role, clarity_rating, experience_rating, would_recommend, user_id, email_verified_at, guest_usage_context",
      )
      .eq("context", "general");

    if (error || !data?.length) {
      return data?.length === 0
        ? {
            totalCount: 0,
            avgClarity: 0,
            avgExperience: 0,
            recommendPct: 0,
            customerCount: 0,
            contractorCount: 0,
          }
        : null;
    }

    const verified = data.filter(countsTowardPublicStats);
    if (!verified.length) {
      return {
        totalCount: 0,
        avgClarity: 0,
        avgExperience: 0,
        recommendPct: 0,
        customerCount: 0,
        contractorCount: 0,
      };
    }

    const totalCount = verified.length;
    const avgClarity =
      verified.reduce((sum, row) => sum + row.clarity_rating, 0) / totalCount;
    const avgExperience =
      verified.reduce((sum, row) => sum + row.experience_rating, 0) / totalCount;
    const recommendPct = Math.round(
      (verified.filter((row) => row.would_recommend).length / totalCount) * 100,
    );

    return {
      totalCount,
      avgClarity,
      avgExperience,
      recommendPct,
      customerCount: verified.filter((row) => row.role === "customer").length,
      contractorCount: verified.filter((row) => row.role === "contractor").length,
    };
  } catch (err) {
    console.error("[public-feedback-stats]", err);
    return null;
  }
}
