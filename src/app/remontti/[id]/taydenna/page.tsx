import Link from "next/link";
import { redirect } from "next/navigation";
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
import { createAdminClient } from "@/lib/supabase/admin";
import {
  resolveGuestProjectAccess,
  setProjectAccessCookie,
} from "@/lib/project-guest-access";

export default async function ProjectCompletionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { id } = await params;
  const { token } = await searchParams;

  if (token) {
    const guestRow = await resolveGuestProjectAccess(id, token);
    if (guestRow) {
      await setProjectAccessCookie(id, token);
      redirect(`/remontti/${id}/taydenna`);
    }
  }

  const user = await getSessionUser();
  const profile = user ? await getProfile() : null;
  if (profile?.role === "contractor") {
    redirect("/oma-tili");
  }

  const supabase = await createClient();
  let isGuestAccess = false;
  let dataClient = supabase;

  let project: {
    id: string;
    title: string;
    status: string;
    customer_id: string | null;
    job_type_id: string;
    details: unknown;
    job_types: { slug: string } | { slug: string }[] | null;
  } | null = null;

  if (user) {
    const { data } = await supabase
      .from("projects")
      .select(
        "id, title, status, customer_id, job_type_id, details, job_types ( slug )",
      )
      .eq("id", id)
      .eq("customer_id", user.id)
      .maybeSingle();
    project = data;
  }

  if (!project) {
    const guestRow = await resolveGuestProjectAccess(id);
    if (guestRow) {
      project = {
        id: guestRow.id as string,
        title: guestRow.title as string,
        status: guestRow.status as string,
        customer_id: (guestRow.customer_id as string | null) ?? null,
        job_type_id: guestRow.job_type_id as string,
        details: guestRow.details,
        job_types: guestRow.job_types as
          | { slug: string }
          | { slug: string }[]
          | null,
      };
      isGuestAccess = true;
      dataClient = createAdminClient();
    }
  }

  if (!project) {
    redirect(`/kirjaudu?redirect=/remontti/${id}/taydenna`);
  }

  const editable = ["draft", "published", "receiving_bids"].includes(
    project.status as string,
  );
  if (!editable) redirect(`/remontti/${id}`);

  const requests = await fetchOpenCompletionRequestsForProject(dataClient, id);
  if (requests.length === 0) redirect(`/remontti/${id}`);

  const contractorIds = [...new Set(requests.map((r) => r.contractor_id))];
  const { data: companies } = await dataClient
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
    job_types: project.job_types,
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
        {isGuestAccess && (
          <p className="mt-3 max-w-2xl text-xs text-stone-500">
            Ei kirjautumista tarvita — täydennät pyynnön suoraan sähköpostilinkistä.
          </p>
        )}

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
