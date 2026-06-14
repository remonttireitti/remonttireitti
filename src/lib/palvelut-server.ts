import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { PUBLIC_SERVICE_SLUGS } from "@/lib/seo-keywords";
import { createAdminClient } from "@/lib/supabase/admin";

export type PublicJobTypeRow = {
  slug: string;
  name_fi: string;
  description_fi: string | null;
  search_keywords: string[];
};

function supabaseForSitemap() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  return process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createAdminClient()
    : createSupabaseClient(url, anonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
}

/** Aktiiviset julkiset työlajit palvelusivuille (ei cookies). */
export async function fetchPublicJobTypesForSeo(): Promise<PublicJobTypeRow[]> {
  const supabase = supabaseForSitemap();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("job_types")
    .select("slug, name_fi, description_fi, search_keywords")
    .eq("is_active", true)
    .in("slug", [...PUBLIC_SERVICE_SLUGS])
    .order("sort_order");

  if (error) {
    console.error("[fetchPublicJobTypesForSeo]", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    slug: row.slug as string,
    name_fi: row.name_fi as string,
    description_fi: (row.description_fi as string | null) ?? null,
    search_keywords: (row.search_keywords as string[] | null) ?? [],
  }));
}

export async function fetchPublicJobTypeBySlug(
  slug: string,
): Promise<PublicJobTypeRow | null> {
  if (!(PUBLIC_SERVICE_SLUGS as readonly string[]).includes(slug)) {
    return null;
  }

  const supabase = supabaseForSitemap();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("job_types")
    .select("slug, name_fi, description_fi, search_keywords")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) return null;

  return {
    slug: data.slug as string,
    name_fi: data.name_fi as string,
    description_fi: (data.description_fi as string | null) ?? null,
    search_keywords: (data.search_keywords as string[] | null) ?? [],
  };
}
