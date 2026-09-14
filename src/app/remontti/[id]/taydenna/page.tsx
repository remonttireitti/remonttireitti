import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { GuestProjectHeader } from "@/components/project/guest-project-header";
import { CustomerCompletionForm } from "@/components/project/customer-completion-form";
import { getProfile, getSessionUser, isContractor } from "@/lib/auth";
import {
  aggregateCompletionNeeds,
  fetchOpenCompletionRequestsForProject,
} from "@/lib/project-completion-requests-server";
import { resolveProjectJobTypeSlug } from "@/lib/project-job-type";
import { brand } from "@/lib/brand-theme";
import { createClient } from "@/lib/supabase/server";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import {
  readProjectAccessToken,
  resolveGuestProjectAccess,
} from "@/lib/project-guest-access";

export const dynamic = "force-dynamic";

type ProjectRow = {
  id: string;
  title: string;
  status: string;
  customer_id: string | null;
  job_type_id: string | null;
  details: unknown;
  job_types: { slug: string } | { slug: string }[] | null;
};

function guestRowToProject(row: Record<string, unknown>): ProjectRow {
  return {
    id: row.id as string,
    title: row.title as string,
    status: row.status as string,
    customer_id: (row.customer_id as string | null) ?? null,
    job_type_id: (row.job_type_id as string | null) ?? null,
    details: row.details,
    job_types: row.job_types as
      | { slug: string }
      | { slug: string }[]
      | null,
  };
}

function GuestAccessError({
  projectId,
  token,
}: {
  projectId: string;
  token?: string;
}) {
  const retryHref = token
    ? `/remontti/${projectId}/taydenna?token=${encodeURIComponent(token)}`
    : `/remontti/${projectId}/taydenna`;

  return (
    <div className={brand.page}>
      <SiteHeader />
      <main className={brand.mainForm}>
        <h1 className="text-2xl font-bold sm:text-3xl">Linkkiä ei voitu avata</h1>
        <p className="mt-3 max-w-xl text-stone-600">
          Täydennyslinkki on vanhentunut, virheellinen tai palvelu ei saa yhteyttä
          tietokantaan juuri nyt. Kokeile avata linkki uudelleen suoraan
          sähköpostista.
        </p>
        <Link
          href={retryHref}
          className={`${brand.btnPrimary} mt-6 inline-flex`}
        >
          Yritä uudelleen
        </Link>
      </main>
    </div>
  );
}

function NoOpenRequestsMessage({
  projectId,
  title,
  guestAccessToken,
  isGuestAccess,
}: {
  projectId: string;
  title: string;
  guestAccessToken?: string;
  isGuestAccess: boolean;
}) {
  const backHref = guestAccessToken
    ? `/remontti/${projectId}?from=auth&token=${encodeURIComponent(guestAccessToken)}`
    : `/remontti/${projectId}`;

  return (
    <div className={brand.page}>
      <SiteHeader />
      <main className={brand.mainForm}>
        <h1 className="text-2xl font-bold sm:text-3xl">Täydennä tarjouspyyntöä</h1>
        <p className="mt-3 max-w-xl text-stone-600">
          Kohteelle <span className="font-medium text-stone-900">{title}</span>{" "}
          ei ole juuri nyt avoimia täydennäpyyntöjä. Pyyntö on ehkä jo täydennetty
          tai urakoitsijan pyyntö on poistunut listalta.
        </p>
        {isGuestAccess && (
          <p className="mt-2 max-w-xl text-xs text-stone-500">
            Jos linkki tulee uudesta sähköpostista, varmista että avaat viimeisimmän
            viestin — vanha linkki voi olla vanhentunut.
          </p>
        )}
        <Link
          href={backHref}
          className="mt-6 inline-block text-sm text-sky-700 hover:underline"
        >
          ← Takaisin tarjouspyyntöön
        </Link>
      </main>
    </div>
  );
}

export default async function ProjectCompletionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string; virhe?: string; from?: string }>;
}) {
  const { id } = await params;
  const { token, virhe, from } = await searchParams;

  if (virhe === "linkki") {
    return <GuestAccessError projectId={id} token={token} />;
  }

  if (token && from !== "auth") {
    redirect(
      `/auth/guest-access?project=${id}&token=${encodeURIComponent(token)}&to=taydenna`,
    );
  }

  try {
    const user = await getSessionUser();
    const profile = user ? await getProfile() : null;

    const guestAccessToken =
      token ?? (await readProjectAccessToken(id)) ?? undefined;

    const supabase = await createClient();
    let isGuestAccess = false;
    let guestRow: Record<string, unknown> | null = null;

    let project: ProjectRow | null = null;

    if (guestAccessToken) {
      guestRow = await resolveGuestProjectAccess(id, guestAccessToken);
      if (guestRow) {
        isGuestAccess = true;
        project = guestRowToProject(guestRow);
      }
    }

    if (!project && user) {
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

    if (!isGuestAccess && (await isContractor())) {
      redirect("/tarjoukset");
    }

    if (!project) {
      if (guestAccessToken || from === "auth") {
        return <GuestAccessError projectId={id} token={guestAccessToken} />;
      }
      redirect(`/kirjaudu?redirect=/remontti/${id}/taydenna`);
    }

    const editable = ["draft", "published", "receiving_bids"].includes(
      project.status,
    );
    if (!editable) redirect(`/remontti/${id}`);

    let dataClient = supabase;
    if (isGuestAccess) {
      const admin = tryCreateAdminClient();
      if (!admin) {
        return <GuestAccessError projectId={id} token={guestAccessToken} />;
      }
      dataClient = admin;
    }

    const requests = await fetchOpenCompletionRequestsForProject(dataClient, id);
    if (requests.length === 0) {
      return (
        <NoOpenRequestsMessage
          projectId={id}
          title={project.title}
          guestAccessToken={isGuestAccess ? guestAccessToken : undefined}
          isGuestAccess={isGuestAccess}
        />
      );
    }

    const contractorIds = [...new Set(requests.map((r) => r.contractor_id))];
    if (contractorIds.length > 0) {
      const { data: companies, error: companiesErr } = await dataClient
        .from("contractor_profiles")
        .select("id, company_name")
        .in("id", contractorIds);
      if (companiesErr) {
        console.error("[taydenna] contractor_profiles:", companiesErr.message);
      }
      const companyById = new Map(
        (companies ?? []).map((c) => [c.id as string, c.company_name as string]),
      );
      for (const req of requests) {
        req.contractorCompany = companyById.get(req.contractor_id) ?? null;
      }
    }

    const jobSlug = resolveProjectJobTypeSlug({
      job_type_id: project.job_type_id,
      job_types: project.job_types,
      details: project.details as Record<string, unknown> | null,
    });

    const needs = aggregateCompletionNeeds(requests, jobSlug);

    const backHref = guestAccessToken
      ? `/remontti/${id}?from=auth&token=${encodeURIComponent(guestAccessToken)}`
      : `/remontti/${id}`;

    const loggedInRoleLabel =
      isGuestAccess && profile?.role === "admin"
        ? "admin"
        : isGuestAccess && profile?.role === "contractor"
          ? "urakoitsija"
          : isGuestAccess && profile?.role === "customer"
            ? "asiakas"
            : isGuestAccess && user
              ? "käyttäjä"
              : null;

    return (
      <div className={brand.page}>
        {isGuestAccess ? (
          <GuestProjectHeader loggedInRole={loggedInRoleLabel} />
        ) : (
          <SiteHeader />
        )}
        <main className={brand.mainForm}>
          <Link href={backHref} className="text-sm text-sky-700 hover:underline">
            ← Takaisin tarjouspyyntöön
          </Link>
          <h1 className="mt-4 text-2xl font-bold sm:text-3xl">
            Täydennä tarjouspyyntöä
          </h1>
          <p className="mt-2 max-w-2xl text-stone-600">
            <span className="font-medium text-stone-900">{project.title}</span> —
            urakoitsijat tarvitsevat lisätietoja tarkempia tarjouksia varten.
            Remonttireitti toimittaa päivityksen automaattisesti kiinnostuneille
            yrityksille.
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
              guestToken={isGuestAccess ? guestAccessToken : undefined}
            />
          </div>
        </main>
      </div>
    );
  } catch (err) {
    const digest =
      err instanceof Error && "digest" in err
        ? String((err as Error & { digest?: string }).digest)
        : undefined;
    if (digest?.startsWith("NEXT_REDIRECT")) {
      throw err;
    }
    console.error("[taydenna/page]", err);
    return <GuestAccessError projectId={id} token={token} />;
  }
}
