import { createClient } from "@/lib/supabase/server";
import { syncContractorAccount } from "@/lib/sync-contractor";
import { syncUserReferrals } from "@/lib/sync-user-referrals";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/oma-tili";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const safeNext = next.startsWith("/") ? next : "/oma-tili";
      if (user) {
        await syncContractorAccount(user);
        await syncUserReferrals(user);
      }
      return NextResponse.redirect(`${origin}${safeNext}`);
    }
  }

  return NextResponse.redirect(`${origin}/kirjaudu?virhe=vahvistys`);
}
