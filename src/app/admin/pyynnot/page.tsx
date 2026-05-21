import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminProjectBidsList } from "@/components/admin/admin-project-bids-list";
import { ProjectRowActions } from "@/components/admin/project-row-actions";
import { SiteHeader } from "@/components/site-header";
import { requireAdmin } from "@/lib/admin";
import { fetchAdminProjectsList } from "@/lib/admin-projects-server";
import { getSessionUser } from "@/lib/auth";
import { projectStatusLabels } from "@/lib/projects";
import type { ProjectStatus } from "@/types/database";

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "Kaikki" },
  { value: "draft", label: "Luonnokset" },
  { value: "active", label: "Aktiiviset" },
  { value: "published", label: "Julkaistu" },
  { value: "receiving_bids", label: "Tarjouksia" },
  { value: "bid_accepted", label: "Hyväksytty" },
  { value: "cancelled", label: "Peruttu" },
];

export default async function AdminProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ tila?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/kirjaudu?redirect=/admin/pyynnot");

  await requireAdmin();

  const { tila = "all" } = await searchParams;
  const { rows, error } = await fetchAdminProjectsList({ statusFilter: tila });

  return (
    <div className="min-h-full bg-stone-50 text-stone-900">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-6 py-12">
        <Link href="/oma-tili" className="text-sm text-sky-700 hover:underline">
          ← Oma tili
        </Link>
        <h1 className="mt-4 text-2xl font-bold">Admin — tarjouspyynnöt</h1>
        <p className="mt-2 text-sm text-stone-600">
          Kaikki asiakkaiden pyynnöt ja tarjousmäärät. Peruuta testipyyntöjä tai
          poista ne pysyvästi.
        </p>

        <AdminNav current="/admin/pyynnot" />

        {error && (
          <p
            className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900"
            role="alert"
          >
            Pyyntöjen haku epäonnistui: {error}
            {error.includes("SERVICE_ROLE") || error.includes("API key")
              ? " — tarkista Vercelissä SUPABASE_SERVICE_ROLE_KEY."
              : null}
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          {STATUS_FILTERS.map((f) => (
            <Link
              key={f.value}
              href={
                f.value === "all" ? "/admin/pyynnot" : `/admin/pyynnot?tila=${f.value}`
              }
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                tila === f.value
                  ? "bg-stone-800 text-white"
                  : "bg-white text-stone-600 ring-1 ring-stone-200 hover:bg-stone-50"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>

        <p className="mt-4 text-sm text-stone-500">
          {rows.length} pyyntö{rows.length === 1 ? "" : "ä"}
        </p>

        <div className="mt-4 space-y-4">
          {rows.length === 0 ? (
            <p className="rounded-xl border border-stone-200 bg-white p-6 text-sm text-stone-600">
              {error
                ? "Ei näytettäviä pyyntöjä haun virheen takia."
                : tila === "draft"
                  ? "Ei luonnoksia. Asiakas on voinut julkaista pyynnön suoraan."
                  : "Ei pyyntöjä tällä suodattimella. Kokeile suodatinta Kaikki."}
            </p>
          ) : (
            rows.map((row) => (
              <article
                key={row.id}
                className="rounded-xl border border-stone-200 bg-white p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/admin/pyynnot/${row.id}`}
                      className="font-semibold text-sky-800 hover:underline"
                    >
                      {row.title}
                    </Link>
                  </div>
                  <span className="shrink-0 rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium">
                    {projectStatusLabels[row.status as ProjectStatus]}
                  </span>
                </div>

                <dl className="mt-3 grid gap-1 text-sm text-stone-600 sm:grid-cols-2">
                  <div>
                    <dt className="text-stone-400">Asiakas</dt>
                    <dd>
                      {row.customerEmail}
                      {row.customerName ? ` (${row.customerName})` : ""}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-stone-400">Sijainti</dt>
                    <dd>
                      {row.postal_code} {row.municipality}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-stone-400">Kategoria</dt>
                    <dd>{row.categoryName}</dd>
                  </div>
                  <div>
                    <dt className="text-stone-400">Luotu</dt>
                    <dd>
                      {new Date(row.created_at).toLocaleString("fi-FI")}
                    </dd>
                  </div>
                  {row.published_at && (
                    <div>
                      <dt className="text-stone-400">Julkaistu</dt>
                      <dd>
                        {new Date(row.published_at).toLocaleString("fi-FI")}
                      </dd>
                    </div>
                  )}
                </dl>

                <div className="mt-4 border-t border-stone-100 pt-4">
                  <h3 className="text-xs font-medium uppercase tracking-wide text-stone-500">
                    Tarjoukset ({row.bidCount})
                  </h3>
                  <div className="mt-2">
                    <AdminProjectBidsList bids={row.bids} compact />
                  </div>
                </div>

                <ProjectRowActions
                  projectId={row.id}
                  title={row.title}
                  status={row.status}
                />
              </article>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
