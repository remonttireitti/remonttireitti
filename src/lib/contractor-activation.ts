import type { Profile } from "@/lib/auth";
import type { User } from "@supabase/supabase-js";

/** Rekisteröity urakoitsijana, mutta profiles.role on vielä customer. */
export function shouldOfferContractorActivation(
  user: User,
  profile: Profile | null,
): boolean {
  if (!profile || profile.role === "contractor" || profile.role === "admin") {
    return false;
  }

  const meta = user.user_metadata ?? {};
  const metaRole = meta.role as string | undefined;
  const company =
    typeof meta.company_name === "string" ? meta.company_name.trim() : "";

  return metaRole === "contractor" || company.length > 0;
}

export function defaultCompanyFromUser(user: User): string {
  const meta = user.user_metadata ?? {};
  return typeof meta.company_name === "string" ? meta.company_name.trim() : "";
}
