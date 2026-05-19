import { createClient } from "@/lib/supabase/server";
import { setContractorBypass } from "@/lib/profile-read";
import type { User } from "@supabase/supabase-js";

/**
 * Korjaa tilanteen jossa rekisteröityminen urakoitsijana ei päivittänyt profiles.role / contractor_profiles.
 * Käyttää service role -päivitystä, jotta RLS ei estä roolin vaihtoa.
 */
export async function syncContractorAccount(user: User): Promise<void> {
  const supabase = await createClient();
  const meta = user.user_metadata ?? {};
  const metaRole = meta.role as string | undefined;
  const companyName =
    (typeof meta.company_name === "string" && meta.company_name.trim()) ||
    "Yritys (täydennä profiilissa)";
  const fullName =
    (typeof meta.full_name === "string" && meta.full_name.trim()) || null;

  const { data: contractorRow } = await supabase
    .from("contractor_profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role === "admin") return;

  const hasCompanyInMeta =
    typeof meta.company_name === "string" && meta.company_name.trim().length > 0;

  const shouldBeContractor =
    metaRole === "contractor" || !!contractorRow || hasCompanyInMeta;

  if (!shouldBeContractor) return;

  if (!profile || profile.role !== "contractor") {
    await setContractorBypass(user.id, companyName, fullName);
    return;
  }

  if (!contractorRow) {
    await setContractorBypass(user.id, companyName, fullName);
  }
}
