import type { createAdminClient } from "@/lib/supabase/admin";
import type { User } from "@supabase/supabase-js";

type AdminClient = ReturnType<typeof createAdminClient>;

/** Onko Supabase Auth -käyttäjän sähköposti vahvistettu. */
export function isEmailVerifiedUser(user: User): boolean {
  if (user.email_confirmed_at) return true;
  const legacy = (user as User & { confirmed_at?: string | null }).confirmed_at;
  return Boolean(legacy);
}

export async function isAuthUserEmailVerified(
  admin: AdminClient,
  userId: string,
): Promise<boolean> {
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data.user) return false;
  return isEmailVerifiedUser(data.user);
}
