import type { Metadata } from "next";
import Link from "next/link";
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
import { HomeHowItWorks } from "@/components/marketing/home-how-it-works";
import { HomeTrust } from "@/components/marketing/home-trust";
import { ServiceCards } from "@/components/marketing/service-cards";
import { HomeNotifications } from "@/components/notifications/home-notifications";
import { ValuePromoPair } from "@/components/promo/value-promo-banner";
import { ListingCardGrid } from "@/components/marketplace/listing-card-grid";
import { SiteHeader } from "@/components/site-header";
import { getSessionUser } from "@/lib/auth";
import { fetchPublishedListings } from "@/lib/marketplace-listings-server";
import {
  countUnreadNotifications,
  fetchArchivedUserNotifications,
  fetchUserNotifications,
} from "@/lib/notifications-server";
import { brand } from "@/lib/brand-theme";
import { marketplaceBrand } from "@/lib/marketplace-brand";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const listings = await fetchPublishedListings(6);
  const user = await getSessionUser();
  let notifications: Awaited<ReturnType<typeof fetchUserNotifications>> = [];
  let archivedNotifications: Awaited<
    ReturnType<typeof fetchArchivedUserNotifications>
  > = [];
  let unreadCount = 0;

  if (user) {
    const supabase = await createClient();
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
      <SiteHeader />

      <main className="pb-16">
        <section className={`${brand.containerWide} pt-6 sm:pt-10`}>
          <div className={`${brand.hero} text-center`}>
            <div className="mb-6 flex justify-center">
              <Logo href="/" size="lg" />
            </div>
            <p className="mb-3 text-sm font-medium uppercase tracking-widest text-sky-800">
              Remontit, palvelut, huolto ja tori
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-stone-900 sm:text-5xl">
              Kilpailuta remontti ja palvelut{" "}
              <span className="text-sky-800">helposti ja ilmaiseksi</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-stone-600 sm:text-lg">
              Keittiö, katto, sähkö, lämmitys — tai siivous, piha, muutto ja
              kunnossapito. Yksi selkeä pyyntö, vertailukelpoiset tarjoukset.
              Myös jatkuva palvelu esim. nurmikon leikkuuun tai lumitöihin.
            </p>
            <ul className="mx-auto mt-6 flex max-w-lg flex-wrap justify-center gap-2 text-xs font-medium text-stone-700 sm:text-sm">
              <li className="rounded-full bg-white/90 px-3 py-1.5 shadow-sm ring-1 ring-sky-100">
                Pätevyydet näkyvissä
              </li>
              <li className="rounded-full bg-white/90 px-3 py-1.5 shadow-sm ring-1 ring-sky-100">
                Arvostelut urakoitsijoille
              </li>
              <li className="rounded-full bg-white/90 px-3 py-1.5 shadow-sm ring-1 ring-sky-100">
                Asiakkaalle ilmainen
              </li>
            </ul>
            <div className="mx-auto mt-8">
              <HomeAudienceSplit />
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

        <section className="border-t border-stone-200 bg-white py-14">
          <div className={brand.containerWide}>
            <h2 className="text-center text-2xl font-bold tracking-tight">
              Neljä tapaa käyttää palvelua
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-center text-sm text-stone-600">
              Remontit, jatkuva kunnossapito, huolto tai osta ja myy laitteita
              torilla.
            </p>
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

        <section className="border-t border-stone-200 bg-white py-12">
          <div className={brand.containerWide}>
            <ValuePromoPair />
          </div>
        </section>

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
            <div className="mt-8">
              <HomeDifferentiators />
            </div>
            <p className="mt-8 text-center text-sm text-stone-700">
              <Link href="/urakoitsijaksi" className={brand.link}>
                Urakoitsijalle: provisiot ja rekisteröityminen →
              </Link>
            </p>
          </div>
        </section>

        <section className="border-t border-stone-200 bg-gradient-to-b from-sky-50/40 to-stone-50 py-16">
          <div className={brand.containerWide}>
            <div className={brand.pageHeaderRow}>
              <div className="min-w-0">
                <p className="text-sm font-medium uppercase tracking-wide text-sky-800">
                  {marketplaceBrand.nameShort}
                </p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                  {marketplaceBrand.name}
                </h2>
                <p className="mt-2 max-w-xl text-stone-600">
                  Remonttiin liittyvät laitteet, varaosat ja tarvikkeet.
                  Yksityishenkilö ilmoittaa ilmaiseksi — yrityksille erillinen
                  hinnasto.
                </p>
              </div>
              <div className={brand.actionsStack}>
                <Link
                  href="/markkinapaikka/ilmoitukset"
                  className={`${brand.btnSecondary} ${brand.btnSecondaryBlock}`}
                >
                  Kaikki ilmoitukset
                </Link>
                <Link
                  href="/markkinapaikka/ilmoita?tyyppi=kuluttaja"
                  className={`${brand.btnPrimary} ${brand.btnPrimaryBlock}`}
                >
                  Ilmoita myytävä
                </Link>
              </div>
            </div>

            <div className="mt-10">
              <ListingCardGrid listings={listings} variant="list" />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
