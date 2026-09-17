import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { HelpRequestForm } from "@/components/help/help-request-form";
import { SiteHeader } from "@/components/site-header";
import { getSessionUser } from "@/lib/auth";
import { brand } from "@/lib/brand-theme";
import { fetchHelpPrefs } from "@/lib/help-requests-server";
import { pageMetadata } from "@/lib/seo";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = pageMetadata({
  title: "Pyydä apua",
  description: "Julkaise vapaaehtoinen apupyyntö lähialueelle.",
  path: "/apu/uusi",
});

export default async function NewHelpRequestPage() {
  const user = await getSessionUser();
  if (!user) redirect("/kirjaudu?redirect=/apu/uusi");

  const supabase = await createClient();
  const prefs = await fetchHelpPrefs(supabase, user.id);

  return (
    <div className={`flex min-h-full flex-col ${brand.page}`}>
      <SiteHeader />
      <main className={`${brand.mainContent} mx-auto w-full max-w-2xl flex-1 pb-16`}>
        <Link href="/apu" className="text-sm text-sky-700 hover:underline">
          ← Takaisin apuun
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-stone-900">Pyydä pientä apua</h1>
        <p className="mt-2 text-sm text-stone-600">
          Kerro mitä tarvitset. Lähialueen ihmiset ja yritykset voivat tarjota
          vapaaehtoista apua.
        </p>
        <div className="mt-6">
          <HelpRequestForm
            defaultPostal={prefs.helpPostalCode ?? undefined}
            defaultMunicipality={prefs.helpMunicipality ?? undefined}
          />
        </div>
      </main>
    </div>
  );
}
