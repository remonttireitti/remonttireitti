import { isLocalMode, LOCAL_USER_ID } from "@/lib/local-mode";
import { createClient } from "@/lib/supabase/server";

/** Palauttaa käyttäjän tai LOCAL_MODE:ssa kevyen paikallisen identiteetin. */
export async function getSessionUser() {
  if (isLocalMode()) {
    return { id: LOCAL_USER_ID, email: "local@alykoti" } as const;
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getSessionSupabase() {
  if (isLocalMode()) return null;
  return createClient();
}
