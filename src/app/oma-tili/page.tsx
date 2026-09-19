import Link from "next/link";
import { redirect } from "next/navigation";
import { ContractorActivationBanner } from "@/components/account/contractor-activation-banner";
import { CustomerReferralCreditsPanel } from "@/components/account/customer-referral-credits-panel";
import {
  defaultCompanyFromUser,
  shouldOfferContractorActivation,
} from "@/lib/contractor-activation";
import { BootstrapProfileForm } from "@/components/account/bootstrap-profile-form";
import { NotificationPreferencesForm } from "@/components/account/notification-preferences-form";
import { ContractorHomeDashboard } from "@/components/contractor/contractor-home-dashboard";
import { ContractorMarketProfilePanel } from "@/components/contractor/contractor-market-profile-panel";
import { SiteHeader } from "@/components/site-header";
import { isAdmin } from "@/lib/admin";
import { getProfile, getSessionUser, isContractor } from "@/lib/auth";
import { canBrowseAsContractor } from "@/lib/admin-preview";
import { fetchContractorDashboard } from "@/lib/contractor-dashboard-server";
import { fetchContractorMarketSignalsForOne } from "@/lib/contractor-market-profile-server";
import { getContractorCompanyBypass } from "@/lib/profile-read";
import { getContractorQualifications } from "@/lib/save-contractor-qualifications";
import { getNotificationPrefs } from "@/lib/notification-prefs";
import { syncContractorAccount } from "@/lib/sync-contractor";
import { projectStatusLabels } from "@/lib/projects";
import { brand } from "@/lib/brand-theme";
import { isEmailConfigured } from "@/lib/email";
import { HuoltokirjaPromoCard } from "@/components/property/huoltokirja-promo-card";
import { countCustomerPropertyStats } from "@/lib/property-log";
import { countAvailableCustomerReferralCredits } from "@/lib/customer-referral";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { ProjectStatus } from "@/types/database";

import { getProfileRoleLabel } from "@/lib/profile-role-labels";

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
  const contractor = (await canBrowseAsContractor()) && !needsContractorFix;
  const admin = await isAdmin();
  const supabase = await createClient();
  const notificationPrefs = await getNotificationPrefs(user.id);

  let contractorCompany: string | null = null;
  let contractorDashboard: Awaited<
    ReturnType<typeof fetchContractorDashboard>
  > | null = null;
  let contractorMarketSignals: Awaited<
    ReturnType<typeof fetchContractorMarketSignalsForOne>
  > | null = null;

  if (contractor) {
    const [quals, dashboard, marketSignals] = await Promise.all([
      getContractorQualifications(user.id),
      fetchContractorDashboard(supabase, user.id),
      fetchContractorMarketSignalsForOne(supabase, user.id),
    ]);
    contractorCompany = quals.companyName || null;
    if (!contractorCompany) {
      contractorCompany = await getContractorCompanyBypass(user.id);
    }
    contractorDashboard = dashboard;
    contractorMarketSignals = marketSignals;
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
  let propertyStats = { propertyCount: 0, logEntryCount: 0 };
  let customerReferralCredits = { count: 0, totalAmountCents: 0 };

  if (params.viesti === "vain-urakoitsijalle") {
    await syncContractorAccount(user);
    if (await isContractor()) redirect("/oma-tili");

    const meta = user.user_metadata ?? {};
    const companyFromMeta =
      typeof meta.company_name === "string" ? meta.company_name : "";

    return (
      <div className={brand.page}>
        <SiteHeader />
        <main className={brand.mainStandard}>
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
    const [{ data }, stats] = await Promise.all([
      supabase
        .from("projects")
        .select(
          "id, title, status, municipality, created_at, service_categories ( name_fi )",
        )
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false }),
      countCustomerPropertyStats(supabase, user.id),
    ]);
    projects = (data ?? []) as ProjectRow[];
    propertyStats = stats;

    const adminClient = tryCreateAdminClient();
    if (adminClient) {
      const count = await countAvailableCustomerReferralCredits(
        adminClient,
        user.id,
      );
      if (count > 0) {
        const { data: credits } = await adminClient
          .from("customer_referral_credits")
          .select("amount_cents")
          .eq("customer_id", user.id)
          .eq("status", "available");
        customerReferralCredits = {
          count,
          totalAmountCents: (credits ?? []).reduce(
            (sum, row) => sum + row.amount_cents,
            0,
          ),
        };
      }
    }
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
      <main className={`${brand.mainStandard} ${contractor ? "lg:max-w-6xl" : ""}`}>
        {!contractor && (
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
              </div>
            </div>
            {!admin && (
              <Link href="/remontti/uusi" className={brand.btnPrimary}>
                + Uusi tarjouspyyntö
              </Link>
            )}
          </header>
        )}

        {needsContractorFix && (
          <div className="mt-6">
            <ContractorActivationBanner
              defaultCompany={defaultCompanyFromUser(user)}
            />
          </div>
        )}

        {!contractor && !admin && customerReferralCredits.count > 0 && (
          <div className="mt-8">
            <CustomerReferralCreditsPanel
              availableCount={customerReferralCredits.count}
              totalAmountCents={customerReferralCredits.totalAmountCents}
            />
          </div>
        )}

        {!contractor && !admin && (
          <HuoltokirjaPromoCard
            className="mt-8"
            propertyCount={propertyStats.propertyCount}
            logEntryCount={propertyStats.logEntryCount}
          />
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

        {contractor && contractorDashboard && (
          <div className="mt-2 space-y-8">
            <ContractorHomeDashboard
              companyName={contractorCompany}
              contractorId={user.id}
              dashboard={contractorDashboard}
            />
            {contractorMarketSignals && (
              <ContractorMarketProfilePanel
                signals={contractorMarketSignals}
                publicProfileHref={`/urakoitsija/${user.id}`}
              />
            )}
          </div>
        )}

        {!contractor && (
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <section className={`${brand.section} p-5 sm:p-6`}>
              <h2 className={brand.sectionTitle}>Tilin tiedot</h2>
              <dl className="mt-4 divide-y divide-stone-100">
                <AccountRow label="Nimi" value={profile?.full_name ?? "—"} />
                <AccountRow
                  label="Rooli"
                  value={
                    profile ? getProfileRoleLabel(profile.role) : "—"
                  }
                />
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
        )}

        {profile &&
          (profile.role === "customer" || profile.role === "contractor") && (
            <section className={`${brand.section} ${contractor ? "mt-8" : "mt-6"} p-5 sm:p-6`}>
              <h2 className={brand.sectionTitle}>Palaute palvelusta</h2>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">
                Kerro, oliko palvelun käyttö selkeää ja miellyttävää — valitse
                asiakkaan tai urakoitsijan näkökulma. Yksi yleispalaute per tili;
                urakan jälkeen erillinen kysely urakkasivulla.
              </p>
              <Link
                href="/palaute"
                className={`${brand.btnSecondary} mt-4 inline-flex`}
              >
                Anna palautetta
              </Link>
            </section>
          )}

        {contractor && profile && (
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <section className={`${brand.section} p-5 sm:p-6`}>
              <h2 className={brand.sectionTitle}>Kirjautuminen</h2>
              <dl className="mt-4 divide-y divide-stone-100">
                <AccountRow label="Sähköposti" value={user.email ?? "—"} />
                <AccountRow label="Nimi" value={profile.full_name ?? "—"} />
                <AccountRow
                  label="Rooli"
                  value={getProfileRoleLabel(profile.role)}
                />
              </dl>
            </section>

            <NotificationPreferencesForm
              role={profile.role}
              prefs={notificationPrefs}
              emailConfigured={isEmailConfigured()}
            />
          </div>
        )}

        {!contractor && !admin && (
          <section className="mt-8">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-stone-900">
                Tarjouspyynnöt
              </h2>
              {projects.length > 0 && (
                <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-600">
                  {projects.length} kpl
                </span>
              )}
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
