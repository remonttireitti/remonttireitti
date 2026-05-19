import { createClient } from "@/lib/supabase/server";
import { getProfileBypassRls } from "@/lib/profile-read";
import type { User } from "@supabase/supabase-js";
import type { UserRole } from "@/types/database";

function roleFromMetadata(user: User): UserRole {
  const r = user.user_metadata?.role as string | undefined;
  if (r === "contractor" || r === "admin" || r === "customer") return r;
  if (user.user_metadata?.company_name) return "contractor";
  return "customer";
}

/** Luo profiles-rivi vain jos puuttuu. Ei yritä uudelleen jos RLS estää lukemisen. */
export async function ensureProfile(user: User): Promise<void> {
  const existingBypass = await getProfileBypassRls(user.id);
  if (existingBypass) return;

  const supabase = await createClient();
  const { data: existing, error: readErr } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (existing) return;
  if (readErr?.message.includes("infinite recursion")) {
    const bypass = await getProfileBypassRls(user.id);
    if (bypass) return;
  }

  const fullName =
    (typeof user.user_metadata?.full_name === "string" &&
      user.user_metadata.full_name) ||
    (typeof user.user_metadata?.name === "string" && user.user_metadata.name) ||
    null;

  const { error } = await supabase.from("profiles").insert({
    id: user.id,
    role: roleFromMetadata(user),
    full_name: fullName,
    avatar_url:
      (user.user_metadata?.avatar_url as string | undefined) ?? null,
  });

  if (!error) return;

  if (
    error.message.includes("duplicate key") ||
    error.code === "23505"
  ) {
    return;
  }

  console.error("[ensureProfile]", error.message, "user:", user.id);
}
