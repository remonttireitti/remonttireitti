import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ContractorProjectFilterBar,
  ProjectMatchBadges,
} from "@/components/contractor/contractor-service-area-form";
import { ValuePromoBanner } from "@/components/promo/value-promo-banner";
import { SiteHeader } from "@/components/site-header";
import {
  fetchContractorOpenProjects,
  loadContractorMatchProfile,
} from "@/lib/contractor-projects-server";
import { getSessionUser, isContractor } from "@/lib/auth";
import { formatBudget } from "@/lib/projects";
import { brand } from "@/lib/brand-theme";
import { createClient } from "@/lib/supabase/server";

export default async function ContractorProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ nayta?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/kirjaudu?redirect=/tarjoukset");

  const contractor = await isContractor();
  if (!contractor) {
    redirect("/oma-tili?viesti=vain-urakoitsijalle");
  }

  const { nayta } = await searchParams;
  const showAll = nayta === "kaikki";

  const supabase = await createClient();
  const profile = await loadContractorMatchProfile(supabase, user.id);
  const allProjects = await fetchContractorOpenProjects(supabase, profile);

  const projects = showAll
    ? allProjects
    : allProjects.filter((p) => p.match.recommended);

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

  function label(p: (typeof allProjects)[number]) {
    return p.job_type_name ?? p.category_name;
  }

  return (
    <div className={brand.page}>
      <SiteHeader />
      <main className={brand.mainStandard}>
        <h1 className="text-2xl font-bold">Avoimet tarjouspyynnöt</h1>
        <p className="mt-2 text-stone-600">
          Oletuksena näytetään oman ammatin pyynnöt valitsemaltasi alueelta.
        </p>

        <ContractorProjectFilterBar
          showAll={showAll}
          recommendedCount={allProjects.filter((p) => p.match.recommended).length}
          totalCount={allProjects.length}
          locationConfigured={locationConfigured}
          maxTravelKm={profile.maxTravelKm}
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
            {showAll ? (
              <p>Ei avoimia pyyntöjä juuri nyt.</p>
            ) : (
              <>
                <p>Ei suodatettuja pyyntöjä juuri nyt.</p>
                <Link
                  href="/tarjoukset?nayta=kaikki"
                  className="mt-3 inline-block text-sm font-medium text-sky-800 hover:underline"
                >
                  Näytä kaikki avoimet pyynnöt
                </Link>
              </>
            )}
          </div>
        ) : (
          <ul className="mt-8 space-y-3">
            {projects.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/tarjoukset/${p.id}`}
                  className="block rounded-xl border border-stone-200 bg-white p-4 hover:border-sky-300"
                >
                  <div className="flex justify-between gap-2">
                    <span className="font-medium">{p.title}</span>
                    {bidProjectIds.has(p.id) && (
                      <span className="text-xs font-medium text-sky-700">
                        Tarjous jätetty
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-stone-500">
                    {label(p)} · {p.municipality}
                  </p>
                  <p className="mt-1 text-sm text-stone-600">
                    Budjetti: {formatBudget(p.budget_min, p.budget_max)}
                  </p>
                  <ProjectMatchBadges match={p.match} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
