import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchPublicOpenProjects } from "@/lib/public-projects-server";

/** Julkaistut torin ilmoitukset sitemapiin — ei käytä cookies()/headers(). */
export async function fetchSitemapListings(): Promise<
  { id: string; updated_at: string }[]
> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    console.error("[sitemap] Supabase URL tai anon key puuttuu");
    return [];
  }

  try {
    const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createAdminClient()
      : createSupabaseClient(url, anonKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });

    const { data, error } = await supabase
      .from("equipment_listings")
      .select("id, updated_at")
      .eq("status", "published")
      .order("published_at", { ascending: false });

    if (error) {
      console.error("[sitemap listings]", error.message);
      return [];
    }

    return (data ?? []) as { id: string; updated_at: string }[];
  } catch (err) {
    console.error("[sitemap listings]", err);
    return [];
  }
}

/** Avoimet tarjouspyynnöt sitemapiin — UGC long-tail (esim. kattoremontti Espoo). */
export async function fetchSitemapProjects(): Promise<
  { id: string; created_at: string }[]
> {
  try {
    const projects = await fetchPublicOpenProjects(100);
    return projects.map((p) => ({ id: p.id, created_at: p.created_at }));
  } catch (err) {
    console.error("[sitemap projects]", err);
    return [];
  }
}
