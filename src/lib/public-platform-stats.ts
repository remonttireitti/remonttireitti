import { createAdminClient } from "@/lib/supabase/admin";

export type PublicPlatformStats = {
  openProjects: number;
  completedProjects: number;
  contractors: number;
  reviews: number;
};

function adminConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

/** Rehelliset alustatilastot etusivulle — admin client, ei yli- lupausta. */
export async function fetchPublicPlatformStats(): Promise<PublicPlatformStats | null> {
  if (!adminConfigured()) return null;

  try {
    const admin = createAdminClient();
    const [openProjects, completedProjects, contractors, reviews] =
      await Promise.all([
        admin
          .from("projects")
          .select("id", { count: "exact", head: true })
          .in("status", ["published", "receiving_bids"]),
        admin
          .from("projects")
          .select("id", { count: "exact", head: true })
          .eq("status", "completed"),
        admin
          .from("contractor_profiles")
          .select("id", { count: "exact", head: true }),
        admin.from("reviews").select("id", { count: "exact", head: true }),
      ]);

    return {
      openProjects: openProjects.count ?? 0,
      completedProjects: completedProjects.count ?? 0,
      contractors: contractors.count ?? 0,
      reviews: reviews.count ?? 0,
    };
  } catch (err) {
    console.error("[public-platform-stats]", err);
    return null;
  }
}
