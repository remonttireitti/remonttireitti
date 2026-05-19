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
    await supabase.rpc("expire_equipment_listings");
  } catch {
    await expireEquipmentListings();
  }
}
