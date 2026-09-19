import Link from "next/link";
import { redirect } from "next/navigation";
import { ContractorSettingsPanel } from "@/components/contractor/contractor-settings-panel";
import { SiteHeader } from "@/components/site-header";
import { canBrowseAsContractor } from "@/lib/admin-preview";
import { getSessionUser } from "@/lib/auth";
import { fetchContractorAccountSettings } from "@/lib/contractor-account-settings-server";
import { brand } from "@/lib/brand-theme";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ContractorCompanySettingsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/kirjaudu?redirect=/oma-tili/yritys");

  if (!(await canBrowseAsContractor())) {
    redirect("/oma-tili?viesti=vain-urakoitsijalle");
  }

  const supabase = await createClient();
  const settings = await fetchContractorAccountSettings(supabase, user.id);

  return (
    <div className={brand.page}>
      <SiteHeader />
      <main className={`${brand.mainStandard} lg:max-w-6xl`}>
        <Link
          href="/oma-tili"
          className="text-sm font-medium text-sky-800 hover:underline"
        >
          ← Työpöytä
        </Link>

        <header className="mt-4">
          <h1 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
            Yrityksen asetukset
          </h1>
          {settings.companyName && (
            <p className="mt-1 text-sm font-medium text-stone-700">
              {settings.companyName}
            </p>
          )}
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600">
            Profiili, brändäys, hinnat ja laskutus. Muutokset vaikuttavat uusiin
            tarjouksiin ja julkiseen profiiliin.
          </p>
        </header>

        <div className="mt-8">
          <ContractorSettingsPanel settings={settings} />
        </div>
      </main>
    </div>
  );
}
