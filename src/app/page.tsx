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
import { getProfile, getSessionUser, isContractor } from "@/lib/auth";
import {
  countUnreadNotifications,
  fetchArchivedUserNotifications,
  fetchUserNotifications,
} from "@/lib/notifications-server";
import { HomePlatformStats } from "@/components/marketing/home-platform-stats";
import { HomeHeroVisual } from "@/components/marketing/home-hero-visual";
import { HomeQualityRequest } from "@/components/marketing/home-quality-request";
import {
  countPublicOpenProjects,
  fetchPublicOpenProjects,
} from "@/lib/public-projects-server";
import { fetchPublicPlatformStats } from "@/lib/public-platform-stats";
import { brand } from "@/lib/brand-theme";
import { fetchBidEvaluationSettings } from "@/lib/bid-evaluation-server";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const user = await getSessionUser();
  const contractor = user ? await isContractor() : false;
  if (contractor) {
    redirect("/tarjoukset");
  }
  const profile = user ? await getProfile() : null;
  const isCustomer = !!user && profile?.role === "customer";

  const [openProjects, openProjectCount, platformStats, bidEvaluationSettings] =
    await Promise.all([
      isCustomer ? Promise.resolve([]) : fetchPublicOpenProjects(12),
      isCustomer ? Promise.resolve(0) : countPublicOpenProjects(),
      fetchPublicPlatformStats(),
      fetchBidEvaluationSettings(supabase),
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
          <div className={`${brand.hero} lg:grid lg:grid-cols-2 lg:items-center lg:gap-10 lg:text-left`}>
            <div className="text-center lg:text-left">
              <div className="mb-6 flex justify-center lg:justify-start">
                <Logo href="/" size="lg" />
              </div>
              <p className="mb-3 text-sm font-medium uppercase tracking-widest text-sky-800">
                Ilmainen kilpailutus
              </p>
              <h1 className="text-3xl font-bold tracking-tight text-stone-900 sm:text-5xl">
                Tarvitsetko remontille{" "}
                <span className="text-sky-800">tekijän?</span>
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-stone-600 sm:text-lg lg:mx-0">
                Julkaise tarjouspyyntö ilmaiseksi — ohjattu lomake, laatupiste ja
                oppiva pohja auttavat kuvaamaan työn selkeästi. Urakoitsijat saavat
                tarpeeksi tietoa tarkkaan tarjoukseen. Vertaa ja tingaa
                vastatarjouksella ennen valintaa.
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
              </ul>
              <div className="mx-auto mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row lg:mx-0 lg:justify-start">
                <Link
                  href="/remontti/uusi"
                  className={`${brand.btnPrimary} ${brand.btnPrimaryBlock}`}
                >
                  Jätä tarjouspyyntö – maksutta
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

        {!isCustomer && (
          <HomeOpenProjects
            projects={openProjects}
            totalCount={openProjectCount}
          />
        )}

        {platformStats && <HomePlatformStats stats={platformStats} />}

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

        <HomeTarjousvahti settings={bidEvaluationSettings} />

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
