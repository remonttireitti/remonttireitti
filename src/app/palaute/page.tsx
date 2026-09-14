import Link from "next/link";
import { PlatformFeedbackPanel } from "@/components/feedback/platform-feedback-panel";
import { SiteHeader } from "@/components/site-header";
import { getProfile, getSessionUser, isContractor } from "@/lib/auth";
import { brand } from "@/lib/brand-theme";
import {
  fetchGeneralPlatformFeedbackForUser,
  fetchPublicFeedbackStats,
} from "@/lib/platform-feedback-server";
import { createClient } from "@/lib/supabase/server";

export default async function PublicFeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ vahvistus?: string; virhe?: string }>;
}) {
  const params = await searchParams;
  const user = await getSessionUser();
  const profile = user ? await getProfile() : null;
  const contractor = user ? await isContractor() : false;
  const defaultRole = contractor ? "contractor" : profile?.role === "customer" ? "customer" : undefined;

  const supabase = await createClient();
  const [stats, existingFeedback] = await Promise.all([
    fetchPublicFeedbackStats(),
    user ? fetchGeneralPlatformFeedbackForUser(supabase, user.id) : Promise.resolve(null),
  ]);

  return (
    <div className={brand.page}>
      <SiteHeader />
      <main className={brand.mainForm}>
        {user ? (
          <Link href="/oma-tili" className="text-sm text-sky-800 hover:underline">
            ← Oma tili
          </Link>
        ) : (
          <Link href="/" className="text-sm text-sky-800 hover:underline">
            ← Etusivu
          </Link>
        )}

        <h1 className="mt-4 text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
          Palaute palvelusta
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600">
          Arvioi Remonttireitin selkeyttä ja käyttömukavuutta — asiakkaana tai
          urakoitsijana. Ilman tiliä voit antaa palautteen sähköpostivahvistuksella.
          Yksi yleispalaute per sähköposti; sen jälkeen voit lähettää tukipyynnön
          ylläpidolle.
        </p>

        {params.vahvistus === "1" && (
          <p
            className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
            role="status"
          >
            Palaute vahvistettu — kiitos! Se on nyt mukana julkisissa tilastoissa.
          </p>
        )}
        {params.virhe && (
          <p
            className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            role="alert"
          >
            {decodeURIComponent(params.virhe)}
          </p>
        )}

        {stats && stats.totalCount > 0 && (
          <div className="mt-6 grid gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-4 sm:grid-cols-3">
            <div className="text-center">
              <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
                Palautteita
              </p>
              <p className="mt-1 text-2xl font-bold text-stone-900">{stats.totalCount}</p>
            </div>
            <div className="text-center">
              <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
                Keskiarvo
              </p>
              <p className="mt-1 text-2xl font-bold text-stone-900">
                {((stats.avgClarity + stats.avgExperience) / 2).toFixed(1)}/5
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
                Suosittelisi
              </p>
              <p className="mt-1 text-2xl font-bold text-stone-900">{stats.recommendPct}%</p>
            </div>
          </div>
        )}

        <div className="mt-8">
          <PlatformFeedbackPanel
            defaultRole={defaultRole}
            existing={existingFeedback}
            requireGuestEmail={!user}
            userEmail={user?.email}
          />
        </div>
      </main>
    </div>
  );
}
