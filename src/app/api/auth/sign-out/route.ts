import { createClient } from "@/lib/supabase/server";

/** Uloskirjautuminen keepalive-beaconista (välilehden sulkeminen). */
export async function POST() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return new Response(null, { status: 204 });
}
