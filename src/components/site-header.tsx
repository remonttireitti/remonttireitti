import { AdminPreviewBar } from "@/components/admin/admin-preview-bar";
import { Logo } from "@/components/brand/logo";
import { SiteHeaderMobileNav } from "@/components/site-header-mobile-nav";
import { SiteHeaderNav } from "@/components/site-header-nav";
import { getProfile, getSessionUser, isContractor } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { getAdminPreviewMode } from "@/lib/admin-preview";
import { isEvaluator } from "@/lib/evaluator";
import { countUnreadNotifications } from "@/lib/notifications-server";
import { hasAnyActiveEvaluator } from "@/lib/bid-evaluation-availability-server";
import { createClient } from "@/lib/supabase/server";

export async function SiteHeader() {
  const user = await getSessionUser();
  const profile = user ? await getProfile() : null;
  const admin = user ? await isAdmin() : false;
  const previewMode = admin ? await getAdminPreviewMode() : null;
  const contractorReal = user ? await isContractor() : false;
  const contractor =
    previewMode === "contractor" ? true : previewMode === "customer" ? false : contractorReal;
  const isCustomer =
    previewMode === "customer"
      ? true
      : previewMode === "contractor"
        ? false
        : profile?.role === "customer" && !contractorReal;
  const evaluator = user ? await isEvaluator() : false;
  let unreadNotifications = 0;

  if (user) {
    const supabase = await createClient();
    unreadNotifications = await countUnreadNotifications(supabase, user.id);
  }

  const showTarjousvahti = await hasAnyActiveEvaluator();

  const navProps = {
    loggedIn: !!user,
    isCustomer,
    isContractor: contractor,
    isAdmin: admin,
    isEvaluator: evaluator,
    unreadNotifications,
    showTarjousvahti,
  };

  return (
    <>
      {admin && <AdminPreviewBar activeMode={previewMode} />}
      <header className="sticky top-0 z-40 px-3 pt-3 sm:px-4">
        <div className="mx-auto max-w-7xl">
          <div className="relative flex min-w-0 items-center justify-between gap-2 rounded-2xl border border-white/60 bg-white/75 px-3 py-2.5 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.12)] ring-1 ring-stone-200/60 backdrop-blur-xl sm:gap-3 sm:px-4 sm:py-3">
            <div className="min-w-0 shrink">
              <Logo href="/" size="sm" compactOnMobile />
            </div>
            <SiteHeaderNav {...navProps} />
          </div>
          <SiteHeaderMobileNav {...navProps} />
        </div>
      </header>
    </>
  );
}
