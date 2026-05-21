import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/admin-nav";
import { UserRowActions } from "@/components/admin/user-row-actions";
import { SiteHeader } from "@/components/site-header";
import { requireAdmin } from "@/lib/admin";
import {
  formatCapability,
  formatRefrigerant,
} from "@/lib/format-qualifications";
import { fetchAdminProjectsList } from "@/lib/admin-projects-server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth";
import { projectStatusLabels } from "@/lib/projects";

export default async function AdminPage() {
  const user = await getSessionUser();
  if (!user) redirect("/kirjaudu?redirect=/admin");

  await requireAdmin();

  const { rows: recentProjects, error: projectsError } =
    await fetchAdminProjectsList({ statusFilter: "all" });

  const admin = createAdminClient();

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, role, full_name, created_at")
    .order("created_at", { ascending: false });

  const { data: contractors } = await admin
    .from("contractor_profiles")
    .select(
      "id, company_name, refrigerant_license, electrical_capability, lvi_capability",
    );

  const contractorByUser = new Map((contractors ?? []).map((c) => [c.id, c]));

  const { data: authList } = await admin.auth.admin.listUsers({
    perPage: 200,
  });

  const emailById = new Map(
    (authList?.users ?? []).map((u) => [u.id, u.email ?? "—"]),
  );

  const rows = (profiles ?? []).map((p) => ({
    ...p,
    email: emailById.get(p.id) ?? "—",
    contractor: contractorByUser.get(p.id) ?? null,
  }));

  return (
    <div className="min-h-full bg-stone-50 text-stone-900">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-6 py-12">
        <Link href="/oma-tili" className="text-sm text-sky-700 hover:underline">
          ← Oma tili
        </Link>
        <h1 className="mt-4 text-2xl font-bold">Admin — käyttäjähallinta</h1>
        <p className="mt-2 text-sm text-stone-600">
          Kehitystyökalu: korjaa roolit ja poista käyttäjiä. Käytä vain luotettavassa
          ympäristössä.
        </p>
        <AdminNav current="/admin" />

        <section className="mt-6 rounded-xl border border-sky-200 bg-sky-50/50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold text-stone-900">Tarjouspyynnöt</h2>
            <Link
              href="/admin/pyynnot"
              className="text-sm font-medium text-sky-800 hover:underline"
            >
              Avaa kaikki ({recentProjects.length}) →
            </Link>
          </div>
          {projectsError ? (
            <p className="mt-2 text-sm text-red-800">
              Pyyntöjen haku epäonnistui. Tarkista SUPABASE_SERVICE_ROLE_KEY.
            </p>
          ) : recentProjects.length === 0 ? (
            <p className="mt-2 text-sm text-stone-600">
              Ei vielä pyyntöjä tietokannassa.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {recentProjects.slice(0, 5).map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/admin/pyynnot/${p.id}`}
                    className="block rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-stone-200 hover:ring-sky-300"
                  >
                    <span className="font-medium">{p.title}</span>
                    <span className="ml-2 text-xs text-stone-500">
                      {projectStatusLabels[p.status]} · {p.bidCount} tarj.
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-stone-500">
            Tarjouspyynnöt ja tarjoukset hallitaan välilehdellä Tarjouspyynnöt, ei
            tällä käyttäjäsivulla.
          </p>
        </section>

        <div className="mt-8 space-y-4">
          {rows.length === 0 ? (
            <p>Ei käyttäjiä.</p>
          ) : (
            rows.map((row) => (
              <article
                key={row.id}
                className="rounded-xl border border-stone-200 bg-white p-4"
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <p className="font-medium">{row.email}</p>
                    <p className="text-xs text-stone-500">{row.id}</p>
                  </div>
                  <span className="rounded-full bg-stone-100 px-2 py-1 text-xs font-medium">
                    {row.role}
                  </span>
                </div>
                {row.full_name && (
                  <p className="mt-1 text-sm text-stone-600">{row.full_name}</p>
                )}
                {row.contractor?.company_name && (
                  <p className="text-sm text-stone-500">
                    Yritys: {row.contractor.company_name}
                  </p>
                )}
                {row.contractor?.refrigerant_license && (
                  <p className="text-xs text-stone-500">
                    Kylmäaine: {formatRefrigerant(row.contractor.refrigerant_license)}
                    {" · "}
                    Sähkö: {formatCapability(row.contractor.electrical_capability)}
                    {" · "}
                    LVI: {formatCapability(row.contractor.lvi_capability)}
                  </p>
                )}
                <UserRowActions
                  userId={row.id}
                  email={row.email}
                  currentRole={row.role}
                  companyName={row.contractor?.company_name ?? null}
                />
              </article>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
