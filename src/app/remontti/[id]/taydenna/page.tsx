import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { CustomerCompletionForm } from "@/components/project/customer-completion-form";
import { getProfile, getSessionUser } from "@/lib/auth";
import {
  aggregateCompletionNeeds,
  fetchOpenCompletionRequestsForProject,
} from "@/lib/project-completion-requests-server";
import { resolveProjectJobTypeSlug } from "@/lib/project-job-type";
import { brand } from "@/lib/brand-theme";
import { createClient } from "@/lib/supabase/server";

export default async function ProjectCompletionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) redirect(`/kirjaudu?redirect=/remontti/${id}/taydenna`);

  const profile = await getProfile();
  if (profile?.role === "contractor") {
    redirect("/oma-tili");
  }

  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select(
      "id, title, status, customer_id, job_type_id, details, job_types ( slug )",
    )
    .eq("id", id)
    .eq("customer_id", user.id)
    .maybeSingle();

  if (!project) notFound();

  const editable = ["draft", "published", "receiving_bids"].includes(
    project.status as string,
  );
  if (!editable) redirect(`/remontti/${id}`);

  const requests = await fetchOpenCompletionRequestsForProject(supabase, id);
  if (requests.length === 0) redirect(`/remontti/${id}`);

  const contractorIds = [...new Set(requests.map((r) => r.contractor_id))];
  const { data: companies } = await supabase
    .from("contractor_profiles")
    .select("id, company_name")
    .in("id", contractorIds);
  const companyById = new Map(
    (companies ?? []).map((c) => [c.id as string, c.company_name as string]),
  );
  for (const req of requests) {
    req.contractorCompany = companyById.get(req.contractor_id) ?? null;
  }

  const jobSlug = resolveProjectJobTypeSlug({
    job_type_id: project.job_type_id as string,
    job_types: project.job_types as
      | { slug: string }
      | { slug: string }[]
      | null,
    details: project.details as Record<string, unknown> | null,
  });

  const needs = aggregateCompletionNeeds(requests, jobSlug);

  return (
    <div className={brand.page}>
      <SiteHeader />
      <main className={brand.mainForm}>
        <Link
          href={`/remontti/${id}`}
          className="text-sm text-sky-700 hover:underline"
        >
          ← Takaisin tarjouspyyntöön
        </Link>
        <h1 className="mt-4 text-2xl font-bold sm:text-3xl">Täydennä tarjouspyyntöä</h1>
        <p className="mt-2 max-w-2xl text-stone-600">
          <span className="font-medium text-stone-900">{project.title}</span> — urakoitsijat
          tarvitsevat lisätietoja tarkempia tarjouksia varten. Remonttireitti toimittaa
          päivityksen automaattisesti kiinnostuneille yrityksille.
        </p>

        <div className="mt-8 max-w-2xl">
          <CustomerCompletionForm
            projectId={id}
            needs={needs}
            requestCount={requests.length}
          />
        </div>
      </main>
    </div>
  );
}
