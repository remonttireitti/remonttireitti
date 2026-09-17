import type { Metadata } from "next";
import Link from "next/link";
import { HelpCommunityBanner } from "@/components/help/help-community-banner";
import { HelpPreferencesForm } from "@/components/help/help-preferences-form";
import { HelpRequestCard } from "@/components/help/help-request-card";
import { SiteHeader } from "@/components/site-header";
import { getSessionUser } from "@/lib/auth";
import { brand } from "@/lib/brand-theme";
import { freeHelpTitle } from "@/lib/help-requests-shared";
import {
  fetchHelpPrefs,
  fetchOpenHelpRequests,
} from "@/lib/help-requests-server";
import { pageMetadata } from "@/lib/seo";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = pageMetadata({
  title: "Pieni apu — vapaaehtoista naapuriapua",
  description:
    "Pyydä pientä apua lähialueelta tai tarjoa vapaaehtoista apua. Ei hintaa — hyvä teko synnyttää hyvää.",
  path: "/apu",
});

export default async function HelpHubPage() {
  const user = await getSessionUser();
  const supabase = await createClient();
  const prefs = user ? await fetchHelpPrefs(supabase, user.id) : null;

  const requests = await fetchOpenHelpRequests(supabase, {
    viewerPostal: prefs?.helpPostalCode,
    maxRadiusKm: prefs?.helpPostalCode ? prefs.helpRadiusKm : undefined,
    excludeUserId: user?.id,
    limit: 30,
  });

  return (
    <div className={`flex min-h-full flex-col ${brand.page}`}>
      <SiteHeader />
      <main className={`${brand.mainContent} mx-auto w-full max-w-3xl flex-1 pb-16`}>
        <p className="text-sm font-medium uppercase tracking-widest text-rose-700">
          Remonttireitti – Apu
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-stone-900">
          Voisiko joku auttaa?
        </h1>
        <p className="mt-3 text-base leading-relaxed text-stone-600">
          Pieni apu on vapaaehtoista — ei hintaa, ei tarjouksia. Naapurit ja paikalliset
          yritykset voivat auttaa kantamisessa, siirtämisessä ja muissa pienissä hommissa.
        </p>

        <HelpCommunityBanner />

        {prefs && prefs.freeHelpsGiven > 0 && (
          <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
            ❤️ {freeHelpTitle(prefs.freeHelpsGiven)}. Kiitos kun autoit muita.
          </p>
        )}

        <div className={`${brand.actionsStack} mt-8`}>
          {user ? (
            <Link href="/apu/uusi" className={brand.btnPrimary}>
              Tarvitsen apua
            </Link>
          ) : (
            <Link href="/kirjaudu?redirect=/apu/uusi" className={brand.btnPrimary}>
              Kirjaudu ja pyydä apua
            </Link>
          )}
          <Link href="/apu/omat" className={brand.btnSecondary}>
            Omat pyynnöt ja auttamiset
          </Link>
        </div>

        {!prefs?.helpPostalCode && user && (
          <div className="mt-10">
            <HelpPreferencesForm prefs={prefs!} />
          </div>
        )}

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-stone-900">
            {prefs?.helpPostalCode
              ? `Apua lähelläsi (${prefs.helpRadiusKm} km)`
              : "Avoimet apupyynnöt"}
          </h2>
          {!prefs?.helpPostalCode && user && (
            <p className="mt-1 text-sm text-stone-600">
              Aseta postinumerosi yllä nähdäksesi etäisyydet ja saadaksesi ilmoituksia.
            </p>
          )}
          <div className="mt-4 space-y-4">
            {requests.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-stone-300 bg-white/60 px-5 py-8 text-center text-sm text-stone-600">
                Ei avoimia apupyyntöjä alueellasi juuri nyt. Voit olla ensimmäinen joka
                pyytää apua — tai odottaa uusia ilmoituksia.
              </p>
            ) : (
              requests.map((r) => <HelpRequestCard key={r.id} request={r} />)
            )}
          </div>
        </section>

        <section className="mt-12 rounded-2xl border border-stone-200 bg-white/80 p-6 text-sm text-stone-600">
          <h2 className="text-base font-semibold text-stone-900">Turvallisuus</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Aloitamme ulkona ja yhteisissä tiloissa — ei suoraan kotiin tuntemattomien kanssa.</li>
            <li>Apu lasketaan vasta, kun pyytäjä ja auttaja molemmat kuittaavat.</li>
            <li>Tämä ei ole maksullinen urakka — remontteihin{" "}
              <Link href="/remontti/uusi" className="text-sky-700 hover:underline">
                kilpailuta erikseen
              </Link>.
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
}
