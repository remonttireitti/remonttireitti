import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HelpOfferForm } from "@/components/help/help-offer-form";
import { SiteHeader } from "@/components/site-header";
import { getSessionUser } from "@/lib/auth";
import { brand } from "@/lib/brand-theme";
import {
  helpCategoryEmoji,
  helpCategoryLabel,
  HELP_LOCATION_TYPES,
} from "@/lib/help-categories";
import {
  formatHelpDistance,
  formatHelpWindow,
} from "@/lib/help-requests-shared";
import {
  fetchHelpOffersForRequest,
  fetchHelpPrefs,
  fetchHelpRequestById,
} from "@/lib/help-requests-server";
import { postalCodeDistanceKm } from "@/lib/geo-distance";
import { pageMetadata } from "@/lib/seo";
import { createClient } from "@/lib/supabase/server";
import {
  acceptHelpOffer,
  cancelHelpRequest,
  confirmHelpReceived,
  markHelpDone,
} from "@/app/actions/help-requests";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const request = await fetchHelpRequestById(supabase, id);
  return pageMetadata({
    title: request?.title ?? "Apupyyntö",
    description: request?.description?.slice(0, 140) ?? "Vapaaehtoinen apupyyntö",
    path: `/apu/${id}`,
  });
}

export default async function HelpRequestDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await getSessionUser();
  const supabase = await createClient();
  const request = await fetchHelpRequestById(supabase, id);
  if (!request) notFound();

  const prefs = user ? await fetchHelpPrefs(supabase, user.id) : null;
  let distanceKm: number | null = null;
  if (prefs?.helpPostalCode) {
    distanceKm = await postalCodeDistanceKm(
      supabase,
      prefs.helpPostalCode,
      request.postal_code,
    );
  }

  const offers = await fetchHelpOffersForRequest(supabase, id);
  const isRequester = user?.id === request.requester_id;
  const myOffer = user ? offers.find((o) => o.helper_id === user.id) : null;
  const acceptedOffer = request.accepted_offer_id
    ? offers.find((o) => o.id === request.accepted_offer_id)
    : null;

  const { data: completion } =
    request.accepted_offer_id && user
      ? await supabase
          .from("help_completions")
          .select("*")
          .eq("request_id", id)
          .maybeSingle()
      : { data: null };

  const locationLabel =
    HELP_LOCATION_TYPES.find((l) => l.id === request.location_type)?.label ??
    request.location_type;

  const canOffer =
    user &&
    !isRequester &&
    request.status === "open" &&
    !myOffer &&
    new Date(request.expires_at).getTime() > Date.now();

  const showMarkDone =
    user &&
    acceptedOffer?.helper_id === user.id &&
    request.status === "matched" &&
    !completion;

  const showConfirm =
    isRequester &&
    completion?.status === "pending_requester";

  return (
    <div className={`flex min-h-full flex-col ${brand.page}`}>
      <SiteHeader />
      <main className={`${brand.mainContent} mx-auto w-full max-w-2xl flex-1 pb-16`}>
        <Link href="/apu" className="text-sm text-sky-700 hover:underline">
          ← Takaisin apuun
        </Link>

        {sp.julkaistu && (
          <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            Apupyyntö julkaistu. Lähialueen auttajat saavat ilmoituksen.
          </p>
        )}

        <article className={`${brand.section} mt-6 p-6`}>
          {request.urgency === "now" && (
            <span className="mb-3 inline-block rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-800">
              Tarvitaan nyt
            </span>
          )}
          <p className="text-sm font-medium text-stone-500">
            {helpCategoryEmoji(request.category)}{" "}
            {helpCategoryLabel(request.category)}
            {distanceKm != null && ` · ${formatHelpDistance(distanceKm)} päässä`}
          </p>
          <h1 className="mt-2 text-2xl font-bold text-stone-900">{request.title}</h1>
          <p className="mt-4 whitespace-pre-wrap text-stone-700">{request.description}</p>

          <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase text-stone-500">Alue</dt>
              <dd>
                {request.postal_code} {request.municipality}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-stone-500">Paikka</dt>
              <dd>{locationLabel}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-stone-500">Aika</dt>
              <dd>{formatHelpWindow(request.window_start, request.window_end)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-stone-500">Tarvitaan</dt>
              <dd>{request.people_needed} henkilöä</dd>
            </div>
          </dl>

          <p className="mt-4 rounded-xl border border-rose-100 bg-rose-50/80 px-4 py-3 text-sm text-rose-950">
            ❤️ Vapaaehtoinen apu — ei palkkiota eikä tarjousta.
          </p>
        </article>

        {canOffer && <div className="mt-6"><HelpOfferForm requestId={id} /></div>}

        {myOffer && !isRequester && (
          <p className="mt-6 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
            Olet tarjonnut apua ({myOffer.status === "pending" ? "odottaa valintaa" : myOffer.status}).
          </p>
        )}

        {isRequester && request.status === "open" && offers.length > 0 && (
          <section className="mt-8">
            <h2 className="text-lg font-semibold">Auttajaehdotukset</h2>
            <ul className="mt-3 space-y-3">
              {offers
                .filter((o) => o.status === "pending")
                .map((o) => (
                  <li
                    key={o.id}
                    className="rounded-2xl border border-stone-200 bg-white p-4"
                  >
                    <p className="font-medium text-stone-900">
                      {o.helper_kind === "company" ? "🏢" : "👤"} {o.helper_display_name}
                    </p>
                    {o.message && (
                      <p className="mt-1 text-sm text-stone-600">{o.message}</p>
                    )}
                    <form action={acceptHelpOffer} className="mt-3">
                      <input type="hidden" name="offer_id" value={o.id} />
                      <input type="hidden" name="request_id" value={id} />
                      <button
                        type="submit"
                        className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
                      >
                        Valitse auttajaksi
                      </button>
                    </form>
                  </li>
                ))}
            </ul>
          </section>
        )}

        {acceptedOffer && request.status !== "open" && (
          <section className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
            <h2 className="font-semibold text-emerald-950">Valittu auttaja</h2>
            <p className="mt-1 text-emerald-900">
              {acceptedOffer.helper_kind === "company" ? "🏢" : "👤"}{" "}
              {acceptedOffer.helper_display_name}
            </p>
            <p className="mt-2 text-sm text-emerald-800/90">
              Sovi käytännön yksityiskohdista viestillä. Osoitetta ei jaeta julkisesti.
            </p>
          </section>
        )}

        {showMarkDone && (
          <form action={markHelpDone} className="mt-6">
            <input type="hidden" name="request_id" value={id} />
            <button
              type="submit"
              className="w-full rounded-2xl bg-stone-800 px-4 py-3 text-sm font-semibold text-white hover:bg-stone-900"
            >
              Merkitse: autoin pyytäjää
            </button>
            <p className="mt-2 text-xs text-stone-500">
              Pyytäjä vahvistaa vielä, että apu toteutui — vasta sitten apu lasketaan.
            </p>
          </form>
        )}

        {showConfirm && completion && (
          <section className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <h2 className="font-semibold text-amber-950">Vahvista saatu apu</h2>
            <p className="mt-2 text-sm text-amber-900">
              Auttaja merkitsi auttaneensa. Vahvista vain, jos sait apua — muuten apua ei
              lasketa auttajan tilille.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <form action={confirmHelpReceived}>
                <input type="hidden" name="completion_id" value={completion.id} />
                <input type="hidden" name="confirmed" value="yes" />
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white"
                >
                  Kyllä, sain apua
                </button>
              </form>
              <form action={confirmHelpReceived}>
                <input type="hidden" name="completion_id" value={completion.id} />
                <input type="hidden" name="confirmed" value="no" />
                <button
                  type="submit"
                  className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-800"
                >
                  En saanut apua
                </button>
              </form>
            </div>
          </section>
        )}

        {request.status === "done" && (
          <p className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            Apu on vahvistettu. Kiitos yhteisöllisyydestä!
          </p>
        )}

        {isRequester && ["open", "matched"].includes(request.status) && (
          <form action={cancelHelpRequest} className="mt-8">
            <input type="hidden" name="request_id" value={id} />
            <button
              type="submit"
              className="text-sm text-stone-500 underline hover:text-stone-800"
            >
              Peru apupyyntö
            </button>
          </form>
        )}

        {!user && request.status === "open" && (
          <p className="mt-8 text-center text-sm text-stone-600">
            <Link href={`/kirjaudu?redirect=/apu/${id}`} className="font-medium text-sky-700 hover:underline">
              Kirjaudu
            </Link>{" "}
            tarjotaksesi apua.
          </p>
        )}
      </main>
    </div>
  );
}
