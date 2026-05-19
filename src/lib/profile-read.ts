import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile } from "@/lib/auth";

const PROFILE_COLUMNS =
  "id, role, full_name, phone, avatar_url" as const;

function adminClient() {
  return createAdminClient();
}

/** Lukee profiilin service role -avaimella (ohittaa RLS). Vain oma rivi. */
export async function getProfileBypassRls(userId: string): Promise<Profile | null> {
  try {
    const admin = adminClient();
    const { data, error } = await admin
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("[getProfileBypassRls]", error.message);
      return null;
    }

    return data;
  } catch (e) {
    console.error("[getProfileBypassRls]", e);
    return null;
  }
}

export async function hasContractorProfileBypass(
  userId: string,
): Promise<boolean> {
  try {
    const { data } = await adminClient()
      .from("contractor_profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();
    return !!data;
  } catch {
    return false;
  }
}

export async function getContractorCompanyBypass(
  userId: string,
): Promise<string | null> {
  try {
    const { data } = await adminClient()
      .from("contractor_profiles")
      .select("company_name")
      .eq("id", userId)
      .maybeSingle();
    return data?.company_name ?? null;
  } catch {
    return null;
  }
}

/** Päivittää urakoitsijan roolin ja contractor_profiles-rivin (ohittaa RLS). */
export async function setContractorBypass(
  userId: string,
  companyName: string,
  fullName?: string | null,
): Promise<{ error?: string }> {
  try {
    const admin = adminClient();
    const { error: profileErr } = await admin
      .from("profiles")
      .update({
        role: "contractor",
        ...(fullName ? { full_name: fullName } : {}),
      })
      .eq("id", userId);

    if (profileErr) return { error: profileErr.message };

    const { error: cpErr } = await admin.from("contractor_profiles").upsert({
      id: userId,
      company_name: companyName,
    });

    if (cpErr) return { error: cpErr.message };
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Tuntematon virhe" };
  }
}
