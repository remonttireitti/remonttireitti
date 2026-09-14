import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

/** Uptime-monitorointi — kevyt tarkistus ilman arkaluontoista dataa. */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let supabaseOk = false;

  if (url && anonKey) {
    try {
      const supabase = createClient(url, anonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { error } = await supabase.from("service_categories").select("id").limit(1);
      supabaseOk = !error;
    } catch {
      supabaseOk = false;
    }
  }

  const ok = supabaseOk;

  return Response.json(
    {
      ok,
      supabase: supabaseOk,
      site: process.env.NEXT_PUBLIC_SITE_URL ?? "https://remonttireitti.fi",
      timestamp: new Date().toISOString(),
    },
    { status: ok ? 200 : 503 },
  );
}
