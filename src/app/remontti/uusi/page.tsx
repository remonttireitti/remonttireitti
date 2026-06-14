import Link from "next/link";
import { redirect } from "next/navigation";
import { ValuePromoBanner } from "@/components/promo/value-promo-banner";
import { SiteHeader } from "@/components/site-header";
import { ProjectWizard } from "@/components/project/project-wizard";
import { getProfile, getSessionUser } from "@/lib/auth";
import { fetchProjectCatalog } from "@/lib/job-catalog-server";

export default async function NewProjectPage() {
  const user = await getSessionUser();
  if (!user) redirect("/kirjaudu?redirect=/remontti/uusi");

  const profile = await getProfile();
  if (profile?.role === "contractor") {
    redirect("/oma-tili");
  }

  const catalog = await fetchProjectCatalog();

  if (catalog.jobTypes.length === 0) {
    return (
      <div className="min-h-full bg-gradient-to-b from-sky-50/40 to-stone-50 text-stone-900">
        <SiteHeader />
        <main className="mx-auto max-w-2xl px-6 py-12">
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
    <div className="min-h-full bg-gradient-to-b from-sky-50/40 to-stone-50 text-stone-900">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
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
          ilmaiseksi.{" "}
          <Link href="/vian-selvitys" className="text-sky-700 hover:underline">
            Lämpöpumppu oireilee? Aloita vian selvityksestä
          </Link>
        </p>
        <div className="mt-6 grid max-w-3xl gap-4 sm:grid-cols-2">
          <ValuePromoBanner variant="customer-free" />
          <ValuePromoBanner variant="customer-negotiate" />
        </div>
        <div className="mt-8">
          <ProjectWizard
            catalog={catalog}
            defaultEmail={user.email ?? ""}
            defaultPhone={profile?.phone ?? ""}
          />
        </div>
      </main>
    </div>
  );
}
