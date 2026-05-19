import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function expireEquipmentListings(): Promise<number> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("expire_equipment_listings");

  if (error) {
    console.error("[expire_equipment_listings]", error.message);
    return 0;
  }

  return typeof data === "number" ? data : 0;
}

/** Lazy expiry on public pages (ei vaadi cronia kehityksessä). */
export async function expireListingsIfNeeded() {
  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("expire_equipment_listings");
    if (!error) return;
  } catch {
    // Anon-RPC ei onnistunut — yritä admin vain jos avain on asetettu.
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return;

  try {
    await expireEquipmentListings();
  } catch (err) {
    console.error("[expireListingsIfNeeded]", err);
  }
}
