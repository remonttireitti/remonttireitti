import { Logo } from "@/components/brand/logo";
import { SiteHeaderNav } from "@/components/site-header-nav";
import { getProfile, getSessionUser, isContractor } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { countUnreadNotifications } from "@/lib/notifications-server";
import { createClient } from "@/lib/supabase/server";

export async function SiteHeader() {
  const user = await getSessionUser();
  const profile = user ? await getProfile() : null;
  const contractor = user ? await isContractor() : false;
  const admin = user ? await isAdmin() : false;
  let unreadNotifications = 0;

  if (user) {
    const supabase = await createClient();
    unreadNotifications = await countUnreadNotifications(supabase, user.id);
  }

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-4">
      <div className="relative mx-auto flex max-w-6xl items-center justify-between gap-3 rounded-2xl border border-white/60 bg-white/75 px-3 py-2.5 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.12)] ring-1 ring-stone-200/60 backdrop-blur-xl sm:px-4 sm:py-3">
        <Logo href="/" size="sm" />
        <SiteHeaderNav
          loggedIn={!!user}
          isCustomer={profile?.role === "customer"}
          isContractor={contractor}
          isAdmin={admin}
          unreadNotifications={unreadNotifications}
        />
      </div>
    </header>
  );
}
