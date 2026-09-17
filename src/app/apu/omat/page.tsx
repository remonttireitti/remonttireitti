import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { HelpPreferencesForm } from "@/components/help/help-preferences-form";
import { SiteHeader } from "@/components/site-header";
import { getSessionUser } from "@/lib/auth";
import { brand } from "@/lib/brand-theme";
import { helpCategoryLabel } from "@/lib/help-categories";
import { freeHelpTitle } from "@/lib/help-requests-shared";
import {
  fetchHelpPrefs,
  fetchUserHelpOffers,
  fetchUserHelpRequests,
} from "@/lib/help-requests-server";
import { pageMetadata } from "@/lib/seo";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = pageMetadata({
  title: "Omat apupyynnöt",
  description: "Hallinnoi apupyyntöjäsi ja vapaaehtoisia auttamisia.",
  path: "/apu/omat",
});

const STATUS_LABELS: Record<string, string> = {
  open: "Avoin",
  matched: "Auttaja valittu",
  done: "Valmis",
  cancelled: "Peruttu",
  expired: "Vanhentunut",
  pending: "Odottaa",
  accepted: "Valittu",
  completed: "Autettu",
};

export default async function MyHelpPage() {
  const user = await getSessionUser();
  if (!user) redirect("/kirjaudu?redirect=/apu/omat");

  const supabase = await createClient();
  const [prefs, myRequests, myOffers] = await Promise.all([
    fetchHelpPrefs(supabase, user.id),
    fetchUserHelpRequests(supabase, user.id),
    fetchUserHelpOffers(supabase, user.id),
  ]);

  return (
    <div className={`flex min-h-full flex-col ${brand.page}`}>
      <SiteHeader />
      <main className={`${brand.mainContent} mx-auto w-full max-w-3xl flex-1 pb-16`}>
        <Link href="/apu" className="text-sm text-sky-700 hover:underline">
          ← Takaisin apuun
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-stone-900">Omat apupyynnöt</h1>

        {prefs.freeHelpsGiven > 0 && (
          <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
            ❤️ {freeHelpTitle(prefs.freeHelpsGiven)}
          </p>
        )}

        <div className="mt-8">
          <HelpPreferencesForm prefs={prefs} />
        </div>

        <section className="mt-10">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Pyytämäni apu</h2>
            <Link href="/apu/uusi" className="text-sm font-medium text-sky-700 hover:underline">
              + Uusi pyyntö
            </Link>
          </div>
          <ul className="mt-3 space-y-2">
            {myRequests.length === 0 ? (
              <li className="text-sm text-stone-600">Et ole vielä pyytänyt apua.</li>
            ) : (
              myRequests.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/apu/${r.id}`}
                    className="block rounded-xl border border-stone-200 bg-white px-4 py-3 hover:border-rose-200"
                  >
                    <span className="font-medium">{r.title}</span>
                    <span className="ml-2 text-xs text-stone-500">
                      {STATUS_LABELS[r.status] ?? r.status} ·{" "}
                      {helpCategoryLabel(r.category)}
                    </span>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold">Tarjoamani apu</h2>
          <ul className="mt-3 space-y-2">
            {myOffers.length === 0 ? (
              <li className="text-sm text-stone-600">
                Et ole vielä tarjonnut apua.{" "}
                <Link href="/apu" className="text-sky-700 hover:underline">
                  Selaa pyyntöjä
                </Link>
              </li>
            ) : (
              myOffers.map((o) => (
                <li key={o.id}>
                  <Link
                    href={`/apu/${o.request_id}`}
                    className="block rounded-xl border border-stone-200 bg-white px-4 py-3 hover:border-rose-200"
                  >
                    <span className="font-medium">
                      {o.help_requests?.title ?? "Apupyyntö"}
                    </span>
                    <span className="ml-2 text-xs text-stone-500">
                      {STATUS_LABELS[o.status] ?? o.status}
                      {o.helper_kind === "company" && " · Yrityksenä"}
                    </span>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </section>
      </main>
    </div>
  );
}
