import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminGridCard, adminGridClassName } from "@/components/admin/admin-grid-card";
import { AdminNav } from "@/components/admin/admin-nav";
import { SiteHeader } from "@/components/site-header";
import { requireAdmin } from "@/lib/admin";
import { fetchAdminProjectsList } from "@/lib/admin-projects-server";
import { getSessionUser } from "@/lib/auth";
import { projectStatusLabels } from "@/lib/projects";
import type { ProjectStatus } from "@/types/database";
import { brand } from "@/lib/brand-theme";

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "Kaikki" },
  { value: "draft", label: "Luonnokset" },
  { value: "active", label: "Aktiiviset" },
  { value: "published", label: "Julkaistu" },
  { value: "has_bids", label: "Tarjouksia saatu" },
  { value: "no_bids", label: "Ei tarjouksia" },
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
    <div className={brand.page}>
      <SiteHeader />
      <main className={brand.mainStandard}>
        <Link href="/oma-tili" className="text-sm text-sky-700 hover:underline">
          ← Oma tili
        </Link>
        <h1 className="mt-4 text-2xl font-bold">Admin — tarjouspyynnöt</h1>
        <p className="mt-2 text-sm text-stone-600">
          Klikkaa pyyntöä avataksesi tiedot, tarjoukset ja hallintatoiminnot.
        </p>

        <AdminNav current="/admin/pyynnot" />

        {error && (
          <p
            className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900"
            role="alert"
          >
            Pyyntöjen haku epäonnistui: {error}
            {error.includes("SERVICE_ROLE") || error.includes("API key")
              ? " — tarkista Cloudflare Worker secrets: SUPABASE_SERVICE_ROLE_KEY."
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

        {rows.length === 0 ? (
          <p className="mt-4 rounded-xl border border-stone-200 bg-white p-6 text-sm text-stone-600">
            {error
              ? "Ei näytettäviä pyyntöjä haun virheen takia."
              : tila === "draft"
                ? "Ei luonnoksia. Asiakas on voinut julkaista pyynnön suoraan."
                : tila === "has_bids"
                  ? "Ei julkaistuja pyyntöjä, joilla olisi vielä tarjouksia. Tarkista suodatin Kaikki tai Julkaistu."
                  : tila === "no_bids"
                    ? "Kaikilla avoimilla pyynnöillä on jo vähintään yksi tarjous."
                    : "Ei pyyntöjä tällä suodattimella. Kokeile suodatinta Kaikki."}
          </p>
        ) : (
          <div className={`mt-4 ${adminGridClassName}`}>
            {rows.map((row) => (
              <AdminGridCard
                key={row.id}
                id={row.id}
                href={`/admin/pyynnot/${row.id}`}
                title={row.title}
                footer={
                  <>
                    <span className="font-medium">Tila:</span>{" "}
                    {projectStatusLabels[row.status as ProjectStatus]}
                    {" · "}
                    {row.bidCount} tarjous
                    {row.bidCount === 1 ? "" : "ta"}
                  </>
                }
              >
                <p>
                  {row.postal_code} {row.municipality}
                </p>
                <p>
                  <span className="text-white/75">Asiakas:</span> {row.customerEmail}
                </p>
                <p>
                  <span className="text-white/75">Kategoria:</span> {row.categoryName}
                </p>
              </AdminGridCard>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
