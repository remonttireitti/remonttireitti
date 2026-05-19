import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/admin-nav";
import { ProjectRowActions } from "@/components/admin/project-row-actions";
import { SiteHeader } from "@/components/site-header";
import { requireAdmin } from "@/lib/admin";
import { getSessionUser } from "@/lib/auth";
import { projectStatusLabels } from "@/lib/projects";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ProjectStatus } from "@/types/database";

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "Kaikki" },
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
  const admin = createAdminClient();

  let query = admin
    .from("projects")
    .select(
      `
      id,
      title,
      status,
      municipality,
      postal_code,
      created_at,
      published_at,
      customer_id,
      service_categories ( name_fi ),
      bids ( id )
    `,
    )
    .order("created_at", { ascending: false });

  if (tila === "active") {
    query = query.in("status", [
      "published",
      "receiving_bids",
      "bid_accepted",
      "in_progress",
    ]);
  } else if (tila !== "all") {
    query = query.eq("status", tila);
  }

  const { data: projects } = await query;

  const customerIds = [
    ...new Set((projects ?? []).map((p) => p.customer_id as string)),
  ];

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name")
    .in("id", customerIds.length > 0 ? customerIds : ["00000000-0000-0000-0000-000000000000"]);

  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  const { data: authList } = await admin.auth.admin.listUsers({ perPage: 200 });
  const emailById = new Map(
    (authList?.users ?? []).map((u) => [u.id, u.email ?? "—"]),
  );

  const rows = (projects ?? []).map((p) => {
    const sc = p.service_categories as
      | { name_fi: string }
      | { name_fi: string }[]
      | null;
    const categoryName = Array.isArray(sc)
      ? (sc[0]?.name_fi ?? "—")
      : (sc?.name_fi ?? "—");
    const bids = p.bids as { id: string }[] | null;

    return {
      id: p.id as string,
      title: p.title as string,
      status: p.status as ProjectStatus,
      municipality: p.municipality as string,
      postal_code: p.postal_code as string,
      created_at: p.created_at as string,
      published_at: p.published_at as string | null,
      customerEmail: emailById.get(p.customer_id as string) ?? "—",
      customerName: nameById.get(p.customer_id as string) ?? null,
      categoryName,
      bidCount: bids?.length ?? 0,
    };
  });

  return (
    <div className="min-h-full bg-stone-50 text-stone-900">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-6 py-12">
        <Link href="/oma-tili" className="text-sm text-sky-700 hover:underline">
          ← Oma tili
        </Link>
        <h1 className="mt-4 text-2xl font-bold">Admin — tarjouspyynnöt</h1>
        <p className="mt-2 text-sm text-stone-600">
          Peruuta testipyyntöjä tai poista ne pysyvästi. Peruutus piilottaa pyynnön
          urakoitsijalistalta; poisto poistaa kaiken dataan liittyvän.
        </p>

        <AdminNav current="/admin/pyynnot" />

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
              Ei pyyntöjä tällä suodattimella.
            </p>
          ) : (
            rows.map((row) => (
              <article
                key={row.id}
                className="rounded-xl border border-stone-200 bg-white p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{row.title}</p>
                    <p className="mt-0.5 text-xs text-stone-500">{row.id}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium">
                    {projectStatusLabels[row.status]}
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
                    <dt className="text-stone-400">Tarjoukset</dt>
                    <dd>{row.bidCount}</dd>
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
