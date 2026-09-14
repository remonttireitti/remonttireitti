import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Vain palvelinpuolella — ohittaa RLS. Älä koskaan käytä selaimessa. */
export function createAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY puuttuu (Cloudflare Worker secrets tai .env.local).",
    );
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function tryCreateAdminClient(): SupabaseClient | null {
  try {
    return createAdminClient();
  } catch (err) {
    console.warn("[tryCreateAdminClient]", err);
    return null;
  }
}
