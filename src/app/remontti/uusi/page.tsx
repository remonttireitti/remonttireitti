import Link from "next/link";
import { redirect } from "next/navigation";
import { ValuePromoBanner } from "@/components/promo/value-promo-banner";
import { SiteHeader } from "@/components/site-header";
import { ProjectWizard } from "@/components/project/project-wizard";
import { getProfile, getSessionUser } from "@/lib/auth";
import { fetchProjectCatalog } from "@/lib/job-catalog-server";
import { parseRemonttiPrefillFromSearchParams } from "@/lib/remontti-prefill";
import { brand } from "@/lib/brand-theme";

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const prefill = parseRemonttiPrefillFromSearchParams(params);

  const user = await getSessionUser();
  if (!user) {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v != null) as [string, string][],
    ).toString();
    redirect(`/kirjaudu?redirect=/remontti/uusi${qs ? `?${qs}` : ""}`);
  }

  const profile = await getProfile();
  if (profile?.role === "contractor") {
    redirect("/oma-tili");
  }

  const catalog = await fetchProjectCatalog();

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

  return (
    <div className={brand.page}>
      <SiteHeader />
      <main className={brand.mainWide}>
        <Link
          href="/oma-tili"
          className="text-sm text-sky-700 hover:underline"
        >
          ← Oma tili
        </Link>
        <h1 className="mt-4 text-2xl font-bold sm:text-3xl">
          Kilpailuta remontti
        </h1>
        <p className="mt-2 max-w-2xl text-stone-600">
          Valitse remontin tyyppi ja täytä pyyntö. Julkaise tarjouspyyntö
          ilmaiseksi.
        </p>
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
            julkaisua.
          </p>
        )}
        <div className="mt-8">
          <ProjectWizard
            catalog={catalog}
            defaultEmail={user.email ?? ""}
            defaultPhone={profile?.phone ?? ""}
            prefill={prefill}
          />
        </div>
      </main>
    </div>
  );
}
