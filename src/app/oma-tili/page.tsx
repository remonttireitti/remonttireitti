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
import { ContractorServiceAreaForm } from "@/components/contractor/contractor-service-area-form";
import { fetchContractorBidDefaultsBundle } from "@/lib/contractor-bid-defaults-server";
import { PUBLIC_CONTRACTOR_TRADE_SLUGS } from "@/constants/contractor-trades";
import { fetchHeatPumpCatalog, fetchJobCatalog } from "@/lib/job-catalog-server";
import { getContractorQualifications } from "@/lib/save-contractor-qualifications";
import {
  formatElectricalQualification,
  formatLviQualifications,
  formatPumpTypes,
  formatRefrigerant,
  formatTrades,
} from "@/lib/format-qualifications";
import { getContractorCompanyBypass } from "@/lib/profile-read";
import { getNotificationPrefs } from "@/lib/notification-prefs";
import { syncContractorAccount } from "@/lib/sync-contractor";
import { projectStatusLabels } from "@/lib/projects";
import { brand } from "@/lib/brand-theme";
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
  let serviceAreaFields = {
    servicePostalCode: "",
    serviceMunicipality: "",
    maxTravelKm: 100,
  };
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
        "business_id, billing_email, billing_address_line, billing_postal_code, billing_city, service_postal_code, service_municipality, max_travel_km",
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
      serviceAreaFields = {
        servicePostalCode: billingRow.service_postal_code ?? "",
        serviceMunicipality: billingRow.service_municipality ?? "",
        maxTravelKm: billingRow.max_travel_km ?? 100,
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
      <div className={brand.page}>
        <SiteHeader />
        <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Oma tili</h1>
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
    <div className={brand.page}>
      <SiteHeader />
      <main className={`mx-auto w-full px-4 py-8 sm:px-6 sm:py-10 ${contractor ? "max-w-5xl" : "max-w-4xl"}`}>
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div
              className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-600 to-sky-700 text-lg font-bold text-white shadow-md shadow-sky-900/20"
              aria-hidden
            >
              {initials(profile?.full_name, user.email)}
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
                Oma tili
              </h1>
              <p className="mt-0.5 truncate text-sm text-stone-500 sm:text-base">
                {user.email}
              </p>
              {contractor && contractorCompany && (
                <p className="mt-0.5 text-sm font-medium text-stone-700">
                  {contractorCompany}
                </p>
              )}
            </div>
          </div>
          {!contractor && !admin && (
            <Link href="/remontti/uusi" className={brand.btnPrimary}>
              + Uusi tarjouspyyntö
            </Link>
          )}
          {contractor && (
            <Link href="/tarjoukset" className={brand.btnPrimary}>
              Selaa tarjouspyyntöjä
            </Link>
          )}
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

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className={`${brand.section} p-5 sm:p-6`}>
            <h2 className={brand.sectionTitle}>Tilin tiedot</h2>
            <dl className="mt-4 divide-y divide-stone-100">
              <AccountRow label="Nimi" value={profile?.full_name ?? "—"} />
              <AccountRow
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
                <AccountRow label="Yritys" value={contractorCompany} />
              )}
              {contractor && contractorQuals && (
                <>
                  <AccountRow
                    label="Ammatit"
                    value={formatTrades(contractorQuals.tradeNames)}
                  />
                  {contractorQuals.jobTypeSlugs.length > 0 && (
                    <>
                      <AccountRow
                        label="Lämpöpumput"
                        value={formatPumpTypes(contractorQuals.jobTypeSlugs)}
                      />
                      <AccountRow
                        label="Kylmäainelupa"
                        value={formatRefrigerant(contractorQuals.refrigerantLicense)}
                      />
                      <AccountRow
                        label="Sähköpätevyys"
                        value={formatElectricalQualification(
                          contractorQuals.electricalQualification,
                        )}
                      />
                      <AccountRow
                        label="LVI-pätevyydet"
                        value={formatLviQualifications(
                          contractorQuals.lviQualifications,
                        )}
                      />
                    </>
                  )}
                </>
              )}
            </dl>
          </section>

          {profile && (
            <NotificationPreferencesForm
              role={profile.role}
              prefs={notificationPrefs}
              emailConfigured={isEmailConfigured()}
            />
          )}
        </div>

        {profile &&
          (profile.role === "customer" || profile.role === "contractor") && (
            <section className={`${brand.section} mt-6 p-5 sm:p-6`}>
              <h2 className={brand.sectionTitle}>Palaute palvelusta</h2>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">
                Kerro, oliko palvelun käyttö selkeää ja miellyttävää. Palautteesi
                auttaa kehittämään Remonttivalitysta.
              </p>
              <Link
                href="/oma-tili/palaute"
                className={`${brand.btnSecondary} mt-4 inline-flex`}
              >
                Anna palautetta
              </Link>
            </section>
          )}

        {!contractor && !admin && (
          <section className="mt-8">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-stone-900">
                Tarjouspyynnöt
              </h2>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/oma-tili/huoltokirja"
                  className="text-sm font-medium text-sky-800 hover:underline"
                >
                  Huoltokirja
                </Link>
                {projects.length > 0 && (
                  <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-600">
                    {projects.length} kpl
                  </span>
                )}
              </div>
            </div>

            {projects.length === 0 ? (
              <div className={`${brand.section} px-6 py-10 text-center`}>
                <p className="text-base font-medium text-stone-800">
                  Ei vielä tarjouspyyntöjä
                </p>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-stone-500">
                  Luo ensimmäinen pyyntö — urakoitsijat voivat lähettää sinulle
                  tarjouksia.
                </p>
                <Link
                  href="/remontti/uusi"
                  className={`${brand.btnPrimary} mt-6 inline-flex`}
                >
                  Luo tarjouspyyntö
                </Link>
              </div>
            ) : (
              <ul className="space-y-3">
                {projects.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/remontti/${p.id}`}
                      className={`${brand.section} block p-4 transition hover:border-sky-200 hover:shadow-md sm:p-5`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-stone-900">{p.title}</p>
                          <p className="mt-1 text-sm text-stone-500">
                            {categoryName(p.service_categories)} · {p.municipality}
                          </p>
                        </div>
                        <ProjectStatusBadge status={p.status} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {admin && (
          <section className="mt-8">
            <h2 className="text-lg font-semibold text-stone-900">Ylläpito</h2>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/admin/pyynnot" className={brand.btnPrimary}>
                Tarjouspyynnöt
              </Link>
              <Link href="/admin/kysynta" className={brand.btnSecondary}>
                Kysyntä
              </Link>
              <Link href="/admin/palaute" className={brand.btnSecondary}>
                Palaute
              </Link>
              <Link href="/admin" className={brand.btnSecondary}>
                Käyttäjät
              </Link>
            </div>
          </section>
        )}

        {contractor && (
          <section className="mt-8 space-y-8">
            <div>
              <h2 className="text-lg font-semibold text-stone-900">
                Urakoitsijan asetukset
              </h2>
              <p className="mt-1 text-sm text-stone-500">
                Profiili, laskutus ja tarjousten oletusehdot. Muutokset vaikuttavat
                uusiin tarjouksiin ja ilmoituksiin.
              </p>
            </div>

            <ContractorBidDefaultsForm
              className="mt-0"
              {...(await fetchContractorBidDefaultsBundle(user.id))}
            />

            <ContractorServiceAreaForm
              className="mt-0"
              servicePostalCode={serviceAreaFields.servicePostalCode}
              serviceMunicipality={serviceAreaFields.serviceMunicipality}
              maxTravelKm={serviceAreaFields.maxTravelKm}
            />

            <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
              {contractorTrades.length > 0 && contractorQuals && (
                <ContractorProfileForm
                  className="mt-0"
                  trades={contractorTrades}
                  jobTypes={heatPumpJobTypes}
                  companyName={contractorQuals.companyName}
                  tradeIds={contractorQuals.tradeIds}
                  jobTypeIds={contractorQuals.jobTypeIds}
                  refrigerantLicense={contractorQuals.refrigerantLicense}
                  electricalQualification={contractorQuals.electricalQualification}
                  lviQualifications={contractorQuals.lviQualifications}
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
          </section>
        )}
      </main>
    </div>
  );
}

function initials(name: string | null | undefined, email: string | undefined): string {
  const source = name?.trim() || email?.split("@")[0] || "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

function AccountRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <dt className="text-sm text-stone-500">{label}</dt>
      <dd className="text-sm font-medium text-stone-900 sm:max-w-[60%] sm:text-right">
        {value}
      </dd>
    </div>
  );
}

const statusBadgeStyles: Partial<Record<ProjectStatus, string>> = {
  draft: "bg-stone-100 text-stone-600",
  published: "bg-sky-100 text-sky-800",
  receiving_bids: "bg-emerald-100 text-emerald-800",
  bid_accepted: "bg-orange-100 text-orange-800",
  in_progress: "bg-violet-100 text-violet-800",
  completed: "bg-stone-100 text-stone-700",
  cancelled: "bg-red-50 text-red-700",
};

function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
        statusBadgeStyles[status] ?? "bg-stone-100 text-stone-600"
      }`}
    >
      {projectStatusLabels[status]}
    </span>
  );
}
