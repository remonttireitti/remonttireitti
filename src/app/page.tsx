import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { pageMetadata } from "@/lib/seo";
import { seoDefByPath } from "@/lib/seo-pages";

const seo = seoDefByPath("/")!;

export const metadata: Metadata = pageMetadata({
  title: seo.title,
  description: seo.description,
  path: "/",
  keywords: seo.keywords,
});
import { HomeAudienceSplit } from "@/components/marketing/home-audience-split";
import { Logo } from "@/components/brand/logo";
import { HomeDifferentiators } from "@/components/marketing/home-differentiators";
import { HomeFaq } from "@/components/marketing/home-faq";
import { HomeHowItWorks } from "@/components/marketing/home-how-it-works";
import { HomeOpenProjects } from "@/components/marketing/home-open-projects";
import { HomePageJsonLd } from "@/components/marketing/home-page-json-ld";
import { HomeSeoContent } from "@/components/marketing/home-seo-content";
import { HomeTarjousvahti } from "@/components/marketing/home-tarjousvahti";
import { HomeTrust } from "@/components/marketing/home-trust";
import { ServiceCards } from "@/components/marketing/service-cards";
import { HomeNotifications } from "@/components/notifications/home-notifications";
import { SiteHeader } from "@/components/site-header";
import { isAdmin } from "@/lib/admin";
import { getAdminPreviewMode } from "@/lib/admin-preview";
import { getProfile, getSessionUser, isContractor } from "@/lib/auth";
import {
  countUnreadNotifications,
  fetchArchivedUserNotifications,
  fetchUserNotifications,
} from "@/lib/notifications-server";
import { HomeFeedbackStats } from "@/components/marketing/home-feedback-stats";
import { HomePlatformStats } from "@/components/marketing/home-platform-stats";
import { HomeHeroVisual } from "@/components/marketing/home-hero-visual";
import { HomeCommunitySection } from "@/components/marketing/home-community-section";
import { HomeCalculatorsSection } from "@/components/marketing/home-calculators-section";
import { HomeHeroCallouts } from "@/components/marketing/home-hero-callouts";
import { HomeOpenHelpRequests } from "@/components/marketing/home-open-help-requests";
import { HomeQualityRequest } from "@/components/marketing/home-quality-request";
import {
  countOpenHelpRequests,
  fetchOpenHelpRequests,
} from "@/lib/help-requests-server";
import {
  countPublicOpenProjects,
  fetchPublicOpenProjects,
} from "@/lib/public-projects-server";
import { fetchPublicPlatformStats } from "@/lib/public-platform-stats";
import { brand } from "@/lib/brand-theme";
import { fetchBidEvaluationSettings } from "@/lib/bid-evaluation-server";
import { hasAnyActiveEvaluator } from "@/lib/bid-evaluation-availability-server";
import { createClient } from "@/lib/supabase/server";
import {
  fetchGeneralPlatformFeedbackForUser,
  fetchPublicFeedbackStats,
} from "@/lib/platform-feedback-server";

export default async function Home() {
  const supabase = await createClient();
  const user = await getSessionUser();
  const previewMode = user && (await isAdmin()) ? await getAdminPreviewMode() : null;
  const contractor = user ? await isContractor() : false;
  if (previewMode === "contractor" || (contractor && previewMode !== "customer")) {
    redirect("/tarjoukset");
  }
  const profile = user ? await getProfile() : null;
  const isCustomer = !!user && profile?.role === "customer";

  const [
    openProjects,
    openProjectCount,
    openHelpRequests,
    openHelpRequestCount,
    platformStats,
    feedbackStats,
    existingFeedback,
    bidEvaluationSettings,
    showTarjousvahti,
  ] = await Promise.all([
    isCustomer ? Promise.resolve([]) : fetchPublicOpenProjects(12),
    isCustomer ? Promise.resolve(0) : countPublicOpenProjects(),
    fetchOpenHelpRequests(supabase, { limit: 12 }),
    countOpenHelpRequests(supabase),
    fetchPublicPlatformStats(),
    fetchPublicFeedbackStats(),
    user ? fetchGeneralPlatformFeedbackForUser(supabase, user.id) : Promise.resolve(null),
    fetchBidEvaluationSettings(supabase),
    hasAnyActiveEvaluator(),
  ]);
  let notifications: Awaited<ReturnType<typeof fetchUserNotifications>> = [];
  let archivedNotifications: Awaited<
    ReturnType<typeof fetchArchivedUserNotifications>
  > = [];
  let unreadCount = 0;

  if (user) {
    const [active, archived, unread] = await Promise.all([
      fetchUserNotifications(supabase, user.id, 12),
      fetchArchivedUserNotifications(supabase, user.id, 50),
      countUnreadNotifications(supabase, user.id),
    ]);
    notifications = active;
    archivedNotifications = archived;
    unreadCount = unread;
  }

  return (
    <div className={brand.page}>
      <HomePageJsonLd />
      <SiteHeader />

      <main className="pb-16">
        <section className={`${brand.containerWide} pt-6 sm:pt-10`}>
          <HomeHeroCallouts isLoggedIn={!!user} />
          <div className={`${brand.hero} lg:grid lg:grid-cols-2 lg:items-center lg:gap-10 lg:text-left`}>
            <div className="text-center lg:text-left">
              {!user && (
                <div className="mb-4 flex justify-center lg:justify-start">
                  <Logo href="/" size="lg" />
                </div>
              )}
              <p className="mb-3 text-sm font-medium uppercase tracking-widest text-sky-800">
                Ilmainen kilpailutus
              </p>
              <h1 className="text-3xl font-bold tracking-tight text-stone-900 sm:text-5xl">
                Tarvitsetko remontille{" "}
                <span className="text-sky-800">tekijän?</span>
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-stone-600 sm:text-lg lg:mx-0">
                Julkaise tarjouspyyntö ilmaiseksi —{" "}
                <span className="font-medium text-stone-800">
                  et tarvitse tiliä eikä rekisteröitymistä.
                </span>{" "}
                Ohjattu lomake, laatupiste ja oppiva pohja auttavat kuvaamaan työn
                selkeästi. Vertaa ja tingaa vastatarjouksella ennen valintaa.
              </p>
              <ul className="mx-auto mt-6 flex max-w-2xl flex-wrap justify-center gap-2 text-xs font-medium text-stone-700 sm:text-sm lg:mx-0 lg:justify-start">
                <li className="rounded-full bg-violet-50 px-3 py-1.5 shadow-sm ring-1 ring-violet-200">
                  Ohjattu tarjouspyyntö
                </li>
                <li className="rounded-full bg-emerald-50 px-3 py-1.5 shadow-sm ring-1 ring-emerald-200">
                  Oppiva pohja työlajeittain
                </li>
                <li className="rounded-full bg-white/90 px-3 py-1.5 shadow-sm ring-1 ring-sky-100">
                  Laadukas pyyntö urakoitsijalle
                </li>
                <li className="rounded-full bg-white/90 px-3 py-1.5 shadow-sm ring-1 ring-sky-100">
                  Asiakkaalle ilmainen
                </li>
                <li className="rounded-full bg-sky-50 px-3 py-1.5 shadow-sm ring-1 ring-sky-300">
                  Ei tiliä tarvita
                </li>
              </ul>
              <div className="mx-auto mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row lg:mx-0 lg:justify-start">
                <Link
                  href="/remontti/uusi"
                  className={`${brand.btnPrimary} ${brand.btnPrimaryBlock}`}
                >
                  {user ? "Jätä tarjouspyyntö – maksutta" : "Jätä tarjouspyyntö ilman tiliä"}
                </Link>
                <Link
                  href={isCustomer ? "/oma-tili" : "/asiakkaalle"}
                  className={`${brand.btnSecondary} ${brand.btnSecondaryBlock}`}
                >
                  {isCustomer ? "Oma tili" : "Miten se toimii?"}
                </Link>
              </div>
              <div className="mx-auto mt-8 lg:mx-0">
                <HomeAudienceSplit hideContractor={isCustomer} />
              </div>
            </div>
            <div className="mt-10 lg:mt-0">
              <HomeHeroVisual />
            </div>
          </div>
        </section>

        {user && (
          <section className="border-t border-stone-200 bg-gradient-to-b from-sky-50/30 to-white">
            <HomeNotifications
              notifications={notifications}
              archivedNotifications={archivedNotifications}
              unreadCount={unreadCount}
            />
          </section>
        )}

        <HomeQualityRequest hideContractorLink={isCustomer} />

        <HomeCommunitySection />

        {!isCustomer && (
          <HomeOpenProjects
            projects={openProjects}
            totalCount={openProjectCount}
          />
        )}

        <HomeOpenHelpRequests
          requests={openHelpRequests}
          totalCount={openHelpRequestCount}
          isLoggedIn={!!user}
        />

        {platformStats && <HomePlatformStats stats={platformStats} />}

        <HomeCalculatorsSection />

        <section className="border-t border-stone-200 bg-white py-14">
          <div className={brand.containerWide}>
            <h2 className="text-center text-2xl font-bold tracking-tight">
              Mitä voit kilpailuttaa
            </h2>
            <div className="mt-8">
              <ServiceCards />
            </div>
          </div>
        </section>

        <section className="border-t border-stone-200 bg-stone-50 py-14 sm:py-16">
          <div className={brand.containerWide}>
            <HomeHowItWorks />
          </div>
        </section>

        <HomeSeoContent />

        {showTarjousvahti && (
          <HomeTarjousvahti settings={bidEvaluationSettings} />
        )}

        <HomeFeedbackStats
          stats={feedbackStats}
          existingFeedback={existingFeedback}
          defaultRole={isCustomer ? "customer" : undefined}
          requireGuestEmail={!user}
          userEmail={user?.email}
        />

        <HomeFaq />

        <section className="border-t border-stone-200/80 bg-white py-14 sm:py-16">
          <div className={brand.containerWide}>
            <HomeTrust />
          </div>
        </section>

        <section className="border-t border-stone-200/80 bg-stone-50/50 py-14 sm:py-16">
          <div className={brand.containerWide}>
            <h2 className="text-2xl font-bold tracking-tight">
              Miksi Remonttireitti?
            </h2>
            <div className="mt-6">
              <HomeDifferentiators />
            </div>
            {!isCustomer && (
              <p className="mt-8 text-center text-sm text-stone-700">
                <Link href="/urakoitsijaksi" className={brand.link}>
                  Urakoitsijalle: tuomme sopivat tarjouspyynnöt →
                </Link>
              </p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
