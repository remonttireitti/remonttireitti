import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminProjectBidsList } from "@/components/admin/admin-project-bids-list";
import { ProjectRowActions } from "@/components/admin/project-row-actions";
import { SiteHeader } from "@/components/site-header";
import { requireAdmin } from "@/lib/admin";
import { fetchAdminProjectById } from "@/lib/admin-projects-server";
import { getSessionUser } from "@/lib/auth";
import { projectStatusLabels } from "@/lib/projects";

export default async function AdminProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/kirjaudu?redirect=/admin/pyynnot");

  await requireAdmin();

  const { id } = await params;
  const project = await fetchAdminProjectById(id);
  if (!project) notFound();

  return (
    <div className="min-h-full bg-stone-50 text-stone-900">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-6 py-12">
        <Link
          href="/admin/pyynnot"
          className="text-sm text-sky-700 hover:underline"
        >
          ← Tarjouspyynnöt
        </Link>
        <h1 className="mt-4 text-2xl font-bold">{project.title}</h1>
        <p className="mt-1 font-mono text-xs text-stone-500">{project.id}</p>

        <AdminNav current="/admin/pyynnot" />

        <div className="mt-6 rounded-xl border border-stone-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium">
              {projectStatusLabels[project.status]}
            </span>
            <span className="text-sm text-stone-600">
              {project.bids.length} tarjous
              {project.bids.length === 1 ? "" : "ta"}
            </span>
          </div>

          <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-stone-400">Asiakas</dt>
              <dd>
                {project.customerEmail}
                {project.customerName ? ` (${project.customerName})` : ""}
              </dd>
            </div>
            <div>
              <dt className="text-stone-400">Sijainti</dt>
              <dd>
                {project.postal_code} {project.municipality}
              </dd>
            </div>
            <div>
              <dt className="text-stone-400">Kategoria</dt>
              <dd>{project.categoryName}</dd>
            </div>
            <div>
              <dt className="text-stone-400">Luotu</dt>
              <dd>{new Date(project.created_at).toLocaleString("fi-FI")}</dd>
            </div>
            {project.published_at && (
              <div>
                <dt className="text-stone-400">Julkaistu</dt>
                <dd>
                  {new Date(project.published_at).toLocaleString("fi-FI")}
                </dd>
              </div>
            )}
          </dl>

          <p className="mt-4 whitespace-pre-wrap text-sm text-stone-700">
            {project.description}
          </p>

          <ProjectRowActions
            projectId={project.id}
            title={project.title}
            status={project.status}
          />
        </div>

        <section className="mt-6">
          <h2 className="text-lg font-semibold">
            Tarjoukset ({project.bids.length})
          </h2>
          <div className="mt-3">
            <AdminProjectBidsList bids={project.bids} />
          </div>
        </section>
      </main>
    </div>
  );
}
