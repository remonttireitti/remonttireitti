import Link from "next/link";
import { redirect } from "next/navigation";
import { ValuePromoBanner } from "@/components/promo/value-promo-banner";
import { SiteHeader } from "@/components/site-header";
import { getSessionUser, isContractor } from "@/lib/auth";
import { formatBudget } from "@/lib/projects";
import { createClient } from "@/lib/supabase/server";

type ProjectRow = {
  id: string;
  title: string;
  municipality: string;
  postal_code: string;
  status: string;
  budget_min: number | null;
  budget_max: number | null;
  created_at: string;
  service_categories: { name_fi: string } | { name_fi: string }[] | null;
  job_types: { name_fi: string } | { name_fi: string }[] | null;
};

export default async function ContractorProjectsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/kirjaudu?redirect=/tarjoukset");

  const contractor = await isContractor();
  if (!contractor) {
    redirect("/oma-tili?viesti=vain-urakoitsijalle");
  }

  const supabase = await createClient();
  const { data: projectsRaw } = await supabase
    .from("projects")
    .select(
      `id, title, municipality, postal_code, status, budget_min, budget_max, created_at,
       service_categories ( name_fi ),
       job_types ( name_fi )`,
    )
    .in("status", ["published", "receiving_bids"])
    .order("created_at", { ascending: false });

  let projects = (projectsRaw ?? []) as ProjectRow[];

  const { data: myTrades } = await supabase
    .from("contractor_trades")
    .select("trade_id")
    .eq("contractor_id", user.id);

  if (myTrades && myTrades.length > 0) {
    const tradeIds = new Set(myTrades.map((t) => t.trade_id));
    const projectIds = projects.map((p) => p.id);

    if (projectIds.length > 0) {
      const { data: projectTrades } = await supabase
        .from("project_trades")
        .select("project_id, trade_id")
        .in("project_id", projectIds);

      const matchingProjectIds = new Set(
        (projectTrades ?? [])
          .filter((row) => tradeIds.has(row.trade_id))
          .map((row) => row.project_id),
      );

      const projectsWithTradeRows = new Set(
        (projectTrades ?? []).map((row) => row.project_id),
      );

      projects = projects.filter((p) => {
        if (!projectsWithTradeRows.has(p.id)) return true;
        return matchingProjectIds.has(p.id);
      });
    }
  }

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

  function label(
    sc: ProjectRow["service_categories"],
    jt: ProjectRow["job_types"],
  ) {
    const jobName = Array.isArray(jt) ? jt[0]?.name_fi : jt?.name_fi;
    if (jobName) return jobName;
    if (!sc) return "Remontti";
    if (Array.isArray(sc)) return sc[0]?.name_fi ?? "Remontti";
    return sc.name_fi;
  }

  return (
    <div className="min-h-full bg-stone-50 text-stone-900">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="text-2xl font-bold">Avoimet tarjouspyynnöt</h1>
        <p className="mt-2 text-stone-600">
          Jätä tarjous asennuksesta ja laitteesta.
        </p>

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
          <p className="mt-8 text-stone-600">Ei avoimia pyyntöjä juuri nyt.</p>
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
                    {label(p.service_categories, p.job_types)} · {p.municipality}
                  </p>
                  <p className="mt-1 text-sm text-stone-600">
                    Budjetti: {formatBudget(p.budget_min, p.budget_max)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
