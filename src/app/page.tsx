import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Kilpailuta lämpöpumppu ilmaiseksi",
  description:
    "Asennus, huolto ja korjaus kilpailutettuna. Tingaa tarjouksia, vertaile asentajia ja löydä laitteet torilta. Urakoitsija maksaa vain hyväksytystä diilistä.",
  path: "/",
});
import { Logo } from "@/components/brand/logo";
import { HomeDifferentiators } from "@/components/marketing/home-differentiators";
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
  fetchUserNotifications,
} from "@/lib/notifications-server";
import { brand } from "@/lib/brand-theme";
import { marketplaceBrand } from "@/lib/marketplace-brand";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const listings = await fetchPublishedListings(6);
  const user = await getSessionUser();
  let notifications: Awaited<ReturnType<typeof fetchUserNotifications>> = [];
  let unreadCount = 0;

  if (user) {
    const supabase = await createClient();
    notifications = await fetchUserNotifications(supabase, user.id, 12);
    unreadCount = await countUnreadNotifications(supabase, user.id);
  }

  return (
    <div className={brand.page}>
      <SiteHeader />

      <main className="pb-16">
        <section className="mx-auto max-w-5xl px-4 pt-6 sm:px-6 sm:pt-10">
          <div className={`${brand.hero} text-center`}>
            <div className="mb-6 flex justify-center">
              <Logo href="/" size="lg" />
            </div>
            <p className="mb-3 text-sm font-medium uppercase tracking-widest text-sky-700">
              Lämpöpumput — asennus, huolto ja tori
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-stone-900 sm:text-5xl">
              Kilpailuta lämpöpumppu{" "}
              <span className="bg-gradient-to-r from-sky-700 to-sky-600 bg-clip-text text-transparent">
                helposti ja ilmaiseksi
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-stone-600 sm:text-lg">
              Yksi selkeä pyyntö — vertailukelpoiset tarjoukset. Näet urakoitsijan
              pätevyydet ja arvostelut ennen valintaa.
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
            <div className="mx-auto mt-8 flex w-full max-w-md flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
              <Link
                href="/remontti/uusi"
                className={`${brand.btnPrimary} ${brand.btnPrimaryBlock} rounded-full px-8`}
              >
                Kilpailuta asennus
              </Link>
              <Link
                href="/huolto/uusi"
                className={`${brand.btnSecondary} ${brand.btnSecondaryBlock} rounded-full px-8`}
              >
                Huolto tai korjaus
              </Link>
              <Link
                href="/urakoitsijaksi"
                className={`${brand.btnSecondary} ${brand.btnSecondaryBlock} rounded-full border-stone-200 px-8 text-stone-700`}
              >
                Olen asentaja
              </Link>
            </div>
          </div>
        </section>

        {user && (
          <section className="border-t border-stone-200 bg-gradient-to-b from-sky-50/30 to-white">
            <HomeNotifications
              notifications={notifications}
              unreadCount={unreadCount}
            />
          </section>
        )}

        <section className="border-t border-stone-200 bg-white py-14">
          <div className="mx-auto max-w-5xl px-6">
            <h2 className="text-center text-2xl font-bold tracking-tight">
              Kolme palvelua yhdessä paikassa
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-center text-sm text-stone-600">
              Valitse tarpeesi — kilpailutus, huolto tai osta/myy laitteita.
            </p>
            <div className="mt-8">
              <ServiceCards />
            </div>
          </div>
        </section>

        <section className="border-t border-stone-200 bg-stone-50 py-12">
          <div className="mx-auto max-w-5xl px-6">
            <ValuePromoPair />
          </div>
        </section>

        <section className="border-t border-stone-200/80 bg-white py-14 sm:py-16">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <HomeTrust />
          </div>
        </section>

        <section className="border-t border-stone-200/80 bg-stone-50/50 py-14 sm:py-16">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <h2 className="text-2xl font-bold tracking-tight">
              Miksi Remonttireitti?
            </h2>
            <div className="mt-8">
              <HomeDifferentiators />
            </div>
            <p className="mt-8 text-center text-sm text-stone-500">
              <Link href="/urakoitsijaksi" className={brand.link}>
                Urakoitsijalle: provisiot ja rekisteröityminen →
              </Link>
            </p>
          </div>
        </section>

        <section className="border-t border-stone-200 bg-stone-50 py-14">
          <div className="mx-auto max-w-5xl px-6">
            <h2 className="text-center text-lg font-semibold text-stone-800">
              Näin kilpailutus etenee
            </h2>
            <ol className="mx-auto mt-8 grid max-w-3xl gap-8 sm:grid-cols-3">
              <li className="text-center">
                <span className="text-2xl font-bold text-sky-700">1</span>
                <p className="mt-2 font-medium">Täytä tarkka pyyntö</p>
                <p className="mt-1 text-sm text-stone-600">
                  Pumpputyyppi, kuvat ja kohteen tiedot — ei geneeristä lomaketta.
                </p>
              </li>
              <li className="text-center">
                <span className="text-2xl font-bold text-sky-700">2</span>
                <p className="mt-2 font-medium">Vertaile ja tingaa</p>
                <p className="mt-1 text-sm text-stone-600">
                  Useita tarjouksia; voit ehdottaa omaa hintaa vastatarjouksella.
                </p>
              </li>
              <li className="text-center">
                <span className="text-2xl font-bold text-sky-700">3</span>
                <p className="mt-2 font-medium">Valitse kumppani</p>
                <p className="mt-1 text-sm text-stone-600">
                  Hyväksy tarjous — yhteystiedot avautuvat, kun urakoitsija on
                  maksanut välityspalkkion.
                </p>
              </li>
            </ol>
          </div>
        </section>

        <section className="border-t border-stone-200 bg-gradient-to-b from-sky-50/40 to-stone-50 py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className={brand.pageHeaderRow}>
              <div className="min-w-0">
                <p className="text-sm font-medium uppercase tracking-wide text-sky-700">
                  {marketplaceBrand.nameShort}
                </p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                  {marketplaceBrand.name}
                </h2>
                <p className="mt-2 max-w-xl text-stone-600">
                  Käytetyt ja uudet lämpöpumput, varaosat ja työkalut. Yksityishenkilö
                  ilmoittaa ilmaiseksi — yrityksille erillinen hinnasto.
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
              <ListingCardGrid listings={listings} />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
