import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/ensure-profile";
import {
  getProfileBypassRls,
  hasContractorProfileBypass,
} from "@/lib/profile-read";
import { syncContractorAccount } from "@/lib/sync-contractor";
import type { UserRole } from "@/types/database";

export type Profile = {
  id: string;
  role: UserRole;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
};

export async function getSessionUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, full_name, phone, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  if (data) {
    await syncContractorAccount(user);
    return data;
  }

  if (error?.message.includes("infinite recursion")) {
    const bypass = await getProfileBypassRls(user.id);
    if (bypass) return bypass;
  } else if (error) {
    console.error("[getProfile]", error.message, "user:", user.id);
  }

  await ensureProfile(user);
  await syncContractorAccount(user);

  const { data: retry, error: retryErr } = await supabase
    .from("profiles")
    .select("id, role, full_name, phone, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  if (retry) return retry;
  if (retryErr?.message.includes("infinite recursion")) {
    return getProfileBypassRls(user.id);
  }

  return getProfileBypassRls(user.id);
}

/** Urakoitsija = rooli contractor TAI contractor_profiles-rivi (varmuuden vuoksi). */
export async function isContractor(): Promise<boolean> {
  const profile = await getProfile();
  if (profile?.role === "contractor") return true;

  const user = await getSessionUser();
  if (!user) return false;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contractor_profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (data) return true;

  if (error?.message.includes("infinite recursion")) {
    return hasContractorProfileBypass(user.id);
  }

  return false;
}
