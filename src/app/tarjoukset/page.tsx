import Link from "next/link";
import { redirect } from "next/navigation";
import { ContractorProjectFilterBar } from "@/components/contractor/contractor-service-area-form";
import { ContractorProjectListItem } from "@/components/contractor/contractor-project-list-item";
import { ValuePromoBanner } from "@/components/promo/value-promo-banner";
import { SiteHeader } from "@/components/site-header";
import {
  fetchContractorOpenProjects,
  loadContractorMatchProfile,
} from "@/lib/contractor-projects-server";
import {
  countByFilter,
  filterContractorProjects,
  parseContractorListFilter,
} from "@/lib/contractor-work-filter";
import { HomeNotifications } from "@/components/notifications/home-notifications";
import { isAdmin } from "@/lib/admin";
import { canBrowseAsContractor } from "@/lib/admin-preview";
import { getSessionUser, isContractor } from "@/lib/auth";
import { brand } from "@/lib/brand-theme";
import {
  countUnreadNotifications,
  fetchArchivedUserNotifications,
  fetchUserNotifications,
} from "@/lib/notifications-server";
import { createClient } from "@/lib/supabase/server";

export default async function ContractorProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ nayta?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/kirjaudu?redirect=/tarjoukset");

  if (!(await canBrowseAsContractor())) {
    if (await isAdmin()) redirect("/admin?viesti=valitse-urakoitsija-esikatselu");
    redirect("/oma-tili?viesti=vain-urakoitsijalle");
  }

  const { nayta } = await searchParams;
  const activeFilter = parseContractorListFilter(nayta);

  const supabase = await createClient();
  const [profile, notifications, archivedNotifications, unreadCount] =
    await Promise.all([
      loadContractorMatchProfile(supabase, user.id),
      fetchUserNotifications(supabase, user.id, 12),
      fetchArchivedUserNotifications(supabase, user.id, 50),
      countUnreadNotifications(supabase, user.id),
    ]);
  const allProjects = await fetchContractorOpenProjects(supabase, user.id, profile);
  const counts = countByFilter(allProjects);
  const projects = filterContractorProjects(allProjects, activeFilter);

  const locationConfigured = Boolean(
    profile.servicePostalCode?.trim() || profile.serviceMunicipality?.trim(),
  );

  const { data: myBids } = await supabase
    .from("bids")
    .select("project_id, status")
    .eq("contractor_id", user.id);

  const bidProjectIds = new Set((myBids ?? []).map((b) => b.project_id));

  const { data: wonInvoices } = await supabase
    .from("platform_invoices")
    .select(
      `
      id,
      status,
      amount_cents,
      due_at,
      project_id,
      projects ( id, title, municipality )
    `,
    )
    .eq("contractor_id", user.id)
    .order("created_at", { ascending: false });

  const emptyMessages: Record<typeof activeFilter, { text: string; link?: string }> = {
    "oma-alue": {
      text: "Ei suodatettuja pyyntöjä juuri nyt.",
      link: "/tarjoukset?nayta=kaikki",
    },
    kaikki: { text: "Ei avoimia pyyntöjä juuri nyt." },
    kiinnostavat: {
      text: "Et ole vielä merkinnyt yhtään pyyntöä kiinnostavaksi.",
      link: "/tarjoukset?nayta=kaikki",
    },
    piilotetut: {
      text: "Ei piilotettuja pyyntöjä.",
      link: "/tarjoukset",
    },
  };

  const empty = emptyMessages[activeFilter];

  return (
    <div className={brand.page}>
      <SiteHeader />
      <main className={brand.mainStandard}>
        <div className="-mx-4 border-b border-stone-200 bg-gradient-to-b from-sky-50/30 to-white sm:-mx-6 [&_#ilmoitukset]:scroll-mt-24">
          <HomeNotifications
            notifications={notifications}
            archivedNotifications={archivedNotifications}
            unreadCount={unreadCount}
          />
        </div>

        <h1 className="mt-8 text-2xl font-bold">Avoimet tarjouspyynnöt</h1>
        <p className="mt-2 text-stone-600">
          Suodata työt alueen, budjetin ja oman kiinnostuksen mukaan.
        </p>

        <ContractorProjectFilterBar
          activeFilter={activeFilter}
          counts={counts}
          locationConfigured={locationConfigured}
          maxTravelKm={profile.maxTravelKm}
          minBudgetEur={profile.minBudgetEur}
        />

        <ValuePromoBanner variant="contractor-pay-on-win" className="mt-6" />

        {wonInvoices && wonInvoices.length > 0 && (
          <section className="mt-8">
            <h2 className="text-lg font-semibold text-orange-900">
              Hyväksytyt tarjoukset
            </h2>
            <ul className="mt-3 space-y-2">
              {wonInvoices.map((inv) => {
                const p = Array.isArray(inv.projects) ? inv.projects[0] : inv.projects;
                if (!p) return null;
                return (
                  <li key={inv.id}>
                    <Link
                      href={`/tarjoukset/urakka/${p.id}`}
                      className="block rounded-xl border border-orange-200 bg-orange-50/60 p-4 hover:border-orange-300"
                    >
                      <span className="font-medium">{p.title}</span>
                      <p className="mt-1 text-sm text-stone-600">
                        {p.municipality} ·{" "}
                        {inv.status === "paid"
                          ? "Yhteystiedot avattu"
                          : "Maksa välitysmaksu →"}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {!projects.length ? (
          <div className="mt-8 rounded-xl border border-stone-200 bg-white p-6 text-stone-600">
            <p>{empty.text}</p>
            {empty.link && (
              <Link
                href={empty.link}
                className="mt-3 inline-block text-sm font-medium text-sky-800 hover:underline"
              >
                {activeFilter === "oma-alue"
                  ? "Näytä kaikki avoimet pyynnöt"
                  : activeFilter === "kiinnostavat"
                    ? "Selaa avoimia pyyntöjä"
                    : "Palaa oletusnäkymään"}
              </Link>
            )}
          </div>
        ) : (
          <ul className="mt-8 space-y-3">
            {projects.map((p) => (
              <ContractorProjectListItem
                key={p.id}
                project={p}
                hasBid={bidProjectIds.has(p.id)}
                showBudgetWarning={activeFilter === "kaikki"}
              />
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
