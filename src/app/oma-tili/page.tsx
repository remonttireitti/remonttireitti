import Link from "next/link";
import { redirect } from "next/navigation";
import { ContractorActivationBanner } from "@/components/account/contractor-activation-banner";
import {
  defaultCompanyFromUser,
  shouldOfferContractorActivation,
} from "@/lib/contractor-activation";
import { BootstrapProfileForm } from "@/components/account/bootstrap-profile-form";
import { NotificationPreferencesForm } from "@/components/account/notification-preferences-form";
import { SiteHeader } from "@/components/site-header";
import { isAdmin } from "@/lib/admin";
import { getProfile, getSessionUser, isContractor } from "@/lib/auth";
import { ContractorBillingForm } from "@/components/contractor/contractor-billing-form";
import { ContractorBidDefaultsForm } from "@/components/contractor/contractor-bid-defaults-form";
import { ContractorProfileForm } from "@/components/contractor/contractor-profile-form";
import { fetchContractorBidDefaultsBundle } from "@/lib/contractor-bid-defaults-server";
import { PUBLIC_CONTRACTOR_TRADE_SLUGS } from "@/constants/contractor-trades";
import { fetchHeatPumpCatalog, fetchJobCatalog } from "@/lib/job-catalog-server";
import { getContractorQualifications } from "@/lib/save-contractor-qualifications";
import {
  formatCapability,
  formatPumpTypes,
  formatRefrigerant,
  formatTrades,
} from "@/lib/format-qualifications";
import { getContractorCompanyBypass } from "@/lib/profile-read";
import { getNotificationPrefs } from "@/lib/notification-prefs";
import { syncContractorAccount } from "@/lib/sync-contractor";
import { projectStatusLabels } from "@/lib/projects";
import { isEmailConfigured } from "@/lib/email";
import { createClient } from "@/lib/supabase/server";
import type { ProjectStatus } from "@/types/database";

const roleLabels = {
  customer: "Asiakas",
  contractor: "Urakoitsija",
  admin: "Ylläpitäjä",
} as const;

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ viesti?: string; virhe?: string; poistettu?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/kirjaudu");

  const params = await searchParams;
  const profile = await getProfile();
  const needsContractorFix = shouldOfferContractorActivation(user, profile);
  const contractor =
    (profile?.role === "contractor" || (await isContractor())) &&
    !needsContractorFix;
  const admin = await isAdmin();
  const supabase = await createClient();
  const notificationPrefs = await getNotificationPrefs(user.id);

  let contractorCompany: string | null = null;
  let contractorQuals: Awaited<ReturnType<typeof getContractorQualifications>> | null =
    null;
  let contractorTrades: { id: string; slug: string; name_fi: string }[] = [];
  let heatPumpJobTypes: { id: string; slug: string }[] = [];
  let billingFields = {
    businessId: "",
    billingEmail: "",
    billingAddressLine: "",
    billingPostalCode: "",
    billingCity: "",
  };

  if (contractor) {
    contractorQuals = await getContractorQualifications(user.id);
    contractorCompany = contractorQuals.companyName || null;
    if (!contractorCompany) {
      contractorCompany = await getContractorCompanyBypass(user.id);
    }
    const [jobCatalog, pumpCatalog] = await Promise.all([
      fetchJobCatalog(),
      fetchHeatPumpCatalog(),
    ]);
    const tradeSlugs = new Set<string>(PUBLIC_CONTRACTOR_TRADE_SLUGS);
    contractorTrades = jobCatalog.trades
      .filter((t) => tradeSlugs.has(t.slug))
      .map((t) => ({ id: t.id, slug: t.slug, name_fi: t.name_fi }));
    heatPumpJobTypes = pumpCatalog.jobTypes.map((j) => ({
      id: j.id,
      slug: j.slug,
    }));

    const { data: billingRow } = await supabase
      .from("contractor_profiles")
      .select(
        "business_id, billing_email, billing_address_line, billing_postal_code, billing_city",
      )
      .eq("id", user.id)
      .maybeSingle();
    if (billingRow) {
      billingFields = {
        businessId: billingRow.business_id ?? "",
        billingEmail: billingRow.billing_email ?? "",
        billingAddressLine: billingRow.billing_address_line ?? "",
        billingPostalCode: billingRow.billing_postal_code ?? "",
        billingCity: billingRow.billing_city ?? "",
      };
    }
  }

  type ProjectRow = {
    id: string;
    title: string;
    status: ProjectStatus;
    municipality: string;
    created_at: string;
    service_categories: { name_fi: string } | { name_fi: string }[] | null;
  };

  let projects: ProjectRow[] = [];

  if (params.viesti === "vain-urakoitsijalle") {
    await syncContractorAccount(user);
    if (await isContractor()) redirect("/tarjoukset");

    const meta = user.user_metadata ?? {};
    const companyFromMeta =
      typeof meta.company_name === "string" ? meta.company_name : "";

    return (
      <div className="min-h-full bg-stone-50 text-stone-900">
        <SiteHeader />
        <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8 sm:py-12">
          <h1 className="text-xl font-bold sm:text-2xl">Oma tili</h1>
          {params.virhe && (
            <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">
              Aktivointi epäonnistui: {decodeURIComponent(params.virhe)}
            </p>
          )}
          <div className="mt-6">
            <ContractorActivationBanner
              defaultCompany={companyFromMeta || defaultCompanyFromUser(user)}
            />
          </div>
        </main>
      </div>
    );
  }

  if (!contractor && !admin) {
    const { data } = await supabase
      .from("projects")
      .select(
        "id, title, status, municipality, created_at, service_categories ( name_fi )",
      )
      .eq("customer_id", user.id)
      .order("created_at", { ascending: false });
    projects = (data ?? []) as ProjectRow[];
  }

  function categoryName(
    sc: ProjectRow["service_categories"],
  ): string {
    if (!sc) return "Remontti";
    if (Array.isArray(sc)) return sc[0]?.name_fi ?? "Remontti";
    return sc.name_fi;
  }

  return (
    <div className="min-h-full bg-stone-50 text-stone-900">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8 sm:py-12">
        <header className="max-w-3xl">
          <h1 className="text-2xl font-bold sm:text-3xl">Oma tili</h1>
          <p className="mt-2 break-all text-stone-600 sm:text-base">{user.email}</p>
        </header>

        {needsContractorFix && (
          <div className="mt-6">
            <ContractorActivationBanner
              defaultCompany={defaultCompanyFromUser(user)}
            />
          </div>
        )}

        {params.viesti === "ei-oikeuksia" && (
          <p className="mt-4 rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
            Ei oikeuksia kyseiseen sivuun. Jos olet ylläpitäjä, paina Synkronoi
            profiili alla.
          </p>
        )}

        {params.poistettu === "1" && (
          <p className="mt-4 rounded-lg bg-stone-100 p-4 text-sm text-stone-800" role="status">
            Tarjouspyyntö poistettiin pysyvästi.
          </p>
        )}

        {!profile && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
            <p className="font-medium">Profiilia ei löydy tälle kirjautumiselle.</p>
            <p className="mt-2 font-mono text-xs break-all">Käyttäjä-ID: {user.id}</p>
            <p className="mt-2">
              Admin-rivi SQL:ssä voi olla eri ID:llä. Korjaa painamalla:
            </p>
            <BootstrapProfileForm />
          </div>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-2 lg:gap-8">
          <div className="space-y-4 rounded-2xl border border-stone-200 bg-white p-4 sm:p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
              Tilin tiedot
            </h2>
            <Row label="Nimi" value={profile?.full_name ?? "—"} />
            <Row
              label="Rooli"
              value={
                profile
                  ? roleLabels[profile.role]
                  : contractor
                    ? roleLabels.contractor
                    : "—"
              }
            />
            {contractorCompany && (
              <Row label="Yritys" value={contractorCompany} />
            )}
            {contractor && contractorQuals && (
              <>
                <Row
                  label="Ammatit"
                  value={formatTrades(contractorQuals.tradeNames)}
                />
                {contractorQuals.jobTypeSlugs.length > 0 && (
                  <>
                    <Row
                      label="Lämpöpumput"
                      value={formatPumpTypes(contractorQuals.jobTypeSlugs)}
                    />
                    <Row
                      label="Kylmäainelupa"
                      value={formatRefrigerant(contractorQuals.refrigerantLicense)}
                    />
                    <Row
                      label="Sähkötyöt"
                      value={formatCapability(contractorQuals.electricalCapability)}
                    />
                    <Row
                      label="LVI-työt"
                      value={formatCapability(contractorQuals.lviCapability)}
                    />
                  </>
                )}
              </>
            )}
          </div>

          {profile && (
            <NotificationPreferencesForm
              className="mt-0 h-fit lg:mt-0"
              role={profile.role}
              prefs={notificationPrefs}
              emailConfigured={isEmailConfigured()}
            />
          )}
        </div>

        {!contractor && !admin && (
          <>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold">Tarjouspyynnöt</h2>
              <Link
                href="/remontti/uusi"
                className="inline-flex w-full shrink-0 items-center justify-center rounded-lg bg-orange-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-800 sm:w-auto sm:rounded-full"
              >
                + Uusi tarjouspyyntö
              </Link>
            </div>

            {projects.length === 0 ? (
              <p className="mt-4 text-stone-600">
                Ei vielä tarjouspyyntöjä.{" "}
                <Link href="/remontti/uusi" className="text-sky-700 underline">
                  Luo ensimmäinen
                </Link>
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {projects.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/remontti/${p.id}`}
                      className="block rounded-xl border border-stone-200 bg-white p-4 hover:border-sky-300"
                    >
                      <div className="flex justify-between gap-2">
                        <span className="font-medium">{p.title}</span>
                        <span className="text-xs text-stone-500">
                          {projectStatusLabels[p.status]}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-stone-500">
                        {categoryName(p.service_categories)} · {p.municipality}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {admin && (
          <div className="mt-8 flex flex-wrap gap-2">
            <Link
              href="/admin/pyynnot"
              className="inline-flex rounded-full bg-stone-800 px-5 py-2.5 text-sm font-medium text-white hover:bg-stone-900"
            >
              Tarjouspyynnöt
            </Link>
            <Link
              href="/admin"
              className="inline-flex rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-medium text-stone-800 hover:bg-stone-50"
            >
              Käyttäjät
            </Link>
          </div>
        )}

        {contractor && (
          <section className="mt-8 space-y-6 lg:mt-10 lg:space-y-8">
            <ContractorBidDefaultsForm
              className="mt-0"
              {...(await fetchContractorBidDefaultsBundle(user.id))}
            />

            <div className="grid gap-6 lg:grid-cols-2 lg:items-start lg:gap-8">
              {contractorTrades.length > 0 && contractorQuals && (
                <ContractorProfileForm
                  className="mt-0"
                  trades={contractorTrades}
                  jobTypes={heatPumpJobTypes}
                  companyName={contractorQuals.companyName}
                  tradeIds={contractorQuals.tradeIds}
                  jobTypeIds={contractorQuals.jobTypeIds}
                  refrigerantLicense={contractorQuals.refrigerantLicense}
                  electricalCapability={contractorQuals.electricalCapability}
                  lviCapability={contractorQuals.lviCapability}
                />
              )}

              <ContractorBillingForm
                className="mt-0"
                businessId={billingFields.businessId}
                billingEmail={billingFields.billingEmail}
                billingAddressLine={billingFields.billingAddressLine}
                billingPostalCode={billingFields.billingPostalCode}
                billingCity={billingFields.billingCity}
              />
            </div>

            <div className="pt-2">
              <Link
                href="/tarjoukset"
                className="inline-flex w-full items-center justify-center rounded-full bg-orange-700 px-5 py-3 text-sm font-medium text-white hover:bg-orange-800 sm:w-auto sm:py-2.5"
              >
                Selaa avoimia lämpöpumppupyyntöjä
              </Link>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 border-b border-stone-100 py-3 last:border-0 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <span className="shrink-0 text-sm text-stone-500">{label}</span>
      <span className="text-sm font-medium sm:max-w-[65%] sm:text-right">
        {value}
      </span>
    </div>
  );
}
