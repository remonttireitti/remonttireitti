import type { SupabaseClient } from "@supabase/supabase-js";

export type PlatformFeedbackRow = {
  id: string;
  user_id: string;
  role: "customer" | "contractor";
  context: "general" | "project_complete";
  project_id: string | null;
  clarity_rating: number;
  experience_rating: number;
  would_recommend: boolean;
  suggestions: string | null;
  created_at: string;
};

export type PlatformFeedbackAdminRow = PlatformFeedbackRow & {
  profiles: { full_name: string | null } | { full_name: string | null }[] | null;
  projects: { title: string } | { title: string }[] | null;
};

export async function fetchPlatformFeedbackForProject(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
): Promise<PlatformFeedbackRow | null> {
  const { data } = await supabase
    .from("platform_feedback")
    .select(
      "id, user_id, role, context, project_id, clarity_rating, experience_rating, would_recommend, suggestions, created_at",
    )
    .eq("user_id", userId)
    .eq("project_id", projectId)
    .maybeSingle();

  return data as PlatformFeedbackRow | null;
}

export async function fetchPlatformFeedbackAdmin(
  supabase: SupabaseClient,
  limit = 200,
): Promise<PlatformFeedbackAdminRow[]> {
  const { data } = await supabase
    .from("platform_feedback")
    .select(
      `
      id, user_id, role, context, project_id,
      clarity_rating, experience_rating, would_recommend, suggestions, created_at,
      profiles ( full_name ),
      projects ( title )
    `,
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []) as PlatformFeedbackAdminRow[];
}
