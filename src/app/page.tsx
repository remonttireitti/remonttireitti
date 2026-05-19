import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Kilpailuta lämpöpumppu ilmaiseksi",
  description:
    "Remonttireitti yhdistää omakotitalot ja lämpöpumppuasentajat. Yksi tarjouspyyntö — useita vertailukelpoisia tarjouksia.",
  path: "/",
});
import { Logo } from "@/components/brand/logo";
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
import { createClient } from "@/lib/supabase/server";

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-stone-600">{body}</p>
    </div>
  );
}

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
    <div className="min-h-full bg-stone-50 text-stone-900">
      <SiteHeader />

      <main>
        <section className="mx-auto max-w-5xl px-6 py-20 text-center">
          <div className="mb-6 flex justify-center">
            <Logo href="/" size="lg" />
          </div>
          <p className="mb-4 text-sm font-medium uppercase tracking-widest text-sky-700">
            Lämpöpumppujen kilpailutus
          </p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Kilpailuta lämpöpumppu{" "}
            <span className="text-sky-700">helposti</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-stone-600">
            Remonttireitti yhdistää omakotitalot ja lämpöpumppuasentajat.
            Yksi tarjouspyyntö — useita vertailukelpoisia tarjouksia ilmaiseksi.
          </p>
          <p className="mx-auto mt-3 max-w-xl text-sm text-stone-500">
            Ilmalämpö-, vesi-ilmalämpö- ja maalämpöpumput.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/remontti/uusi"
              className="rounded-full bg-orange-600 px-8 py-3 font-medium text-white hover:bg-orange-700"
            >
              Kilpailuta lämpöpumppu
            </Link>
            <Link
              href="/rekisteroidy?rooli=urakoitsija"
              className="rounded-full border border-stone-300 px-8 py-3 font-medium text-stone-700 hover:bg-stone-100"
            >
              Olen lämpöpumppuasentaja
            </Link>
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

        <section className="border-t border-stone-200 bg-white py-12">
          <div className="mx-auto max-w-5xl px-6">
            <ValuePromoPair />
          </div>
        </section>

        <section className="border-t border-stone-200 bg-stone-50 py-16">
          <div className="mx-auto grid max-w-5xl gap-10 px-6 sm:grid-cols-3">
            <Feature
              title="1. Valitse pumpputyyppi"
              body="Ilmalämpö, vesi-ilmalämpö tai maalämpö — ohjattu lomake kertoo asentajalle tarvittavat tiedot."
            />
            <Feature
              title="2. Vertaile tarjouksia"
              body="Saat useita tarjouksia: laite, asennus, takuu ja aikataulu samassa muodossa."
            />
            <Feature
              title="3. Valitse asentaja"
              body="Vertaile tarjouksia rauhassa ja valitse luotettava kumppani."
            />
          </div>
        </section>

        <section className="border-t border-stone-200 bg-gradient-to-b from-sky-50/40 to-stone-50 py-16">
          <div className="mx-auto max-w-6xl px-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm font-medium uppercase tracking-wide text-sky-700">
                  Markkinapaikka
                </p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                  Myytävät laitteet ja osat
                </h2>
                <p className="mt-2 max-w-xl text-stone-600">
                  Selaa ilmoituksia kirjautumatta. Yksityishenkilöt voivat myydä
                  ilmaiseksi — yrityksille hinnasto erikseen.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/markkinapaikka/ilmoitukset"
                  className="rounded-lg border border-sky-200 bg-white px-4 py-2 text-sm font-medium text-sky-900 hover:bg-sky-50"
                >
                  Kaikki ilmoitukset
                </Link>
                <Link
                  href="/markkinapaikka/ilmoita?tyyppi=kuluttaja"
                  className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
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
