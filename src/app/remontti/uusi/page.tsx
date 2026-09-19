import Link from "next/link";
import { redirect } from "next/navigation";
import { ValuePromoBanner } from "@/components/promo/value-promo-banner";
import { SiteHeader } from "@/components/site-header";
import { ProjectWizard } from "@/components/project/project-wizard";
import { isAdmin } from "@/lib/admin";
import { canBrowseAsCustomer } from "@/lib/admin-preview";
import { getProfile, getSessionUser, isContractor } from "@/lib/auth";
import { fetchProjectCatalog } from "@/lib/job-catalog-server";
import { parseRemonttiPrefillFromSearchParams } from "@/lib/remontti-prefill";
import { brand } from "@/lib/brand-theme";
import {
  fetchAllEmphasizedCriteria,
  fetchAllLearnedCriteria,
} from "@/lib/template-criterion-stats";
import { createClient } from "@/lib/supabase/server";

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const prefill = parseRemonttiPrefillFromSearchParams(params);

  const user = await getSessionUser();
  const profile = user ? await getProfile() : null;

  if (!(await canBrowseAsCustomer())) {
    if (await isContractor()) redirect("/tarjoukset");
    if (await isAdmin()) redirect("/admin?viesti=valitse-asiakas-esikatselu");
    redirect("/oma-tili");
  }

  const supabase = await createClient();
  const [catalog, emphasizedCriteria, learnedCriteria] = await Promise.all([
    fetchProjectCatalog(),
    fetchAllEmphasizedCriteria(supabase),
    fetchAllLearnedCriteria(supabase),
  ]);

  if (catalog.jobTypes.length === 0) {
    return (
      <div className={brand.page}>
        <SiteHeader />
        <main className={brand.mainForm}>
          <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
            Remonttityypit puuttuvat tietokannasta. Aja Supabasessa migraatiot{" "}
            <code className="text-xs">20260519190000_expand_omakotitalo_catalog.sql</code>{" "}
            ja{" "}
            <code className="text-xs">20260614100000_activate_remontti_catalog.sql</code>.
          </p>
        </main>
      </div>
    );
  }

  const isGuest = !user;

  return (
    <div className={brand.page}>
      <SiteHeader />
      <main className={brand.mainWide}>
        {user ? (
          <Link href="/oma-tili" className="text-sm text-sky-700 hover:underline">
            ← Oma tili
          </Link>
        ) : (
          <Link href="/" className="text-sm text-sky-700 hover:underline">
            ← Etusivu
          </Link>
        )}
        <h1 className="mt-4 text-2xl font-bold sm:text-3xl">
          {isGuest ? "Jätä tarjouspyyntö – maksutta" : "Kilpailuta remontti"}
        </h1>
        <p className="mt-2 max-w-2xl text-stone-600">
          {isGuest
            ? "Täytä pyyntö ilman tiliä. Lähetämme vahvistuslinkin sähköpostiisi — julkaisu ja urakoitsijailmoitukset tapahtuvat vasta vahvistuksen jälkeen. Linkki on voimassa 24 tuntia."
            : "Valitse remontin tyyppi ja täytä pyyntö. Julkaise tarjouspyyntö ilmaiseksi."}{" "}
          <Link href="/laskurit" className="font-medium text-violet-800 hover:underline">
            Arvioi kustannukset laskurilla
          </Link>{" "}
          ennen lähettämistä.
        </p>
        {isGuest && (
          <p className="mt-3 max-w-2xl rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
            <span className="font-medium">Huomio:</span> ilman tiliä et voi viestitellä
            urakoitsijoiden kanssa sovelluksessa — tarjoukset ja ilmoitukset tulevat
            sähköpostiin. Tilin luonnin jälkeen voit keskustella urakoitsijoiden kanssa
            ennen tarjouksen valintaa.
          </p>
        )}
        <div className="mt-6 grid max-w-3xl gap-4 sm:grid-cols-2">
          <ValuePromoBanner variant="customer-free" />
          <ValuePromoBanner variant="customer-negotiate" />
        </div>
        {prefill.jobSlug && (
          <p
            className="mt-4 rounded-lg bg-sky-50 p-3 text-sm text-sky-900"
            role="status"
          >
            Työn tyyppi ja kuvaus on esitäytetty linkistä — tarkista tiedot ennen
            lähettämistä.
          </p>
        )}
        <div className="mt-8">
          <ProjectWizard
            catalog={catalog}
            defaultEmail={user?.email ?? ""}
            defaultPhone={profile?.phone ?? ""}
            prefill={prefill}
            emphasizedCriteria={emphasizedCriteria}
            learnedCriteria={learnedCriteria}
            isGuest={isGuest}
          />
        </div>
      </main>
    </div>
  );
}
