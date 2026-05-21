import { bidTotalAmountCents } from "@/lib/bid-amounts";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ProjectStatus } from "@/types/database";

export type AdminBidSummary = {
  id: string;
  project_id: string;
  status: string;
  amount_cents: number;
  offers_equipment: boolean | null;
  equipment_amount_cents: number | null;
  company_name: string | null;
  contractorEmail: string | null;
  submitted_at: string | null;
};

export type AdminProjectListRow = {
  id: string;
  title: string;
  status: ProjectStatus;
  municipality: string;
  postal_code: string;
  created_at: string;
  published_at: string | null;
  customer_id: string;
  customerEmail: string;
  customerName: string | null;
  categoryName: string;
  bidCount: number;
  bids: AdminBidSummary[];
};

function contractorCompanyFromRow(
  cp: { company_name: string | null } | { company_name: string | null }[] | null,
): string | null {
  if (!cp) return null;
  if (Array.isArray(cp)) return cp[0]?.company_name ?? null;
  return cp.company_name;
}

async function loadAuthEmails(
  admin: ReturnType<typeof createAdminClient>,
  userIds: string[],
): Promise<Map<string, string>> {
  if (userIds.length === 0) return new Map();
  const { data: authList } = await admin.auth.admin.listUsers({ perPage: 200 });
  const wanted = new Set(userIds);
  return new Map(
    (authList?.users ?? [])
      .filter((u) => wanted.has(u.id))
      .map((u) => [u.id, u.email ?? "—"]),
  );
}

export async function fetchAdminProjectsList(options?: {
  statusFilter?: string;
}): Promise<{ rows: AdminProjectListRow[]; error: string | null }> {
  const admin = createAdminClient();
  const tila = options?.statusFilter ?? "all";

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
      service_categories ( name_fi )
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
  } else if (tila === "draft") {
    query = query.eq("status", "draft");
  } else if (tila === "has_bids" || tila === "no_bids") {
    query = query.in("status", ["published", "receiving_bids"]);
  } else if (tila !== "all") {
    query = query.eq("status", tila);
  }

  const { data: projects, error } = await query;

  if (error) {
    console.error("[fetchAdminProjectsList]", error.code, error.message);
    return { rows: [], error: error.message };
  }

  const projectIds = (projects ?? []).map((p) => p.id as string);
  const bidsByProject = new Map<string, AdminBidSummary[]>();

  if (projectIds.length > 0) {
    const { data: bidRows, error: bidsError } = await admin
      .from("bids")
      .select(
        `
        id,
        project_id,
        status,
        amount_cents,
        offers_equipment,
        equipment_amount_cents,
        submitted_at,
        contractor_id,
        contractor_profiles ( company_name )
      `,
      )
      .in("project_id", projectIds)
      .order("submitted_at", { ascending: false, nullsFirst: false });

    if (bidsError) {
      console.error("[fetchAdminProjectsList] bids", bidsError.code, bidsError.message);
      return { rows: [], error: bidsError.message };
    }

    const contractorIds = [
      ...new Set((bidRows ?? []).map((b) => b.contractor_id as string)),
    ];
    const contractorEmailById = await loadAuthEmails(admin, contractorIds);

    for (const row of bidRows ?? []) {
      const pid = row.project_id as string;
      const summary: AdminBidSummary = {
        id: row.id as string,
        project_id: pid,
        status: row.status as string,
        amount_cents: row.amount_cents as number,
        offers_equipment: row.offers_equipment as boolean | null,
        equipment_amount_cents: row.equipment_amount_cents as number | null,
        company_name: contractorCompanyFromRow(
          row.contractor_profiles as
            | { company_name: string | null }
            | { company_name: string | null }[]
            | null,
        ),
        contractorEmail:
          contractorEmailById.get(row.contractor_id as string) ?? null,
        submitted_at: row.submitted_at as string | null,
      };
      const list = bidsByProject.get(pid) ?? [];
      list.push(summary);
      bidsByProject.set(pid, list);
    }
  }

  const customerIds = [
    ...new Set((projects ?? []).map((p) => p.customer_id as string)),
  ];

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name")
    .in(
      "id",
      customerIds.length > 0 ? customerIds : ["00000000-0000-0000-0000-000000000000"],
    );

  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  const { data: authList } = await admin.auth.admin.listUsers({ perPage: 200 });
  const emailById = new Map(
    (authList?.users ?? []).map((u) => [u.id, u.email ?? "—"]),
  );

  const COUNTABLE_BID_STATUSES = new Set([
    "submitted",
    "accepted",
    "rejected",
    "withdrawn",
  ]);

  let rows = (projects ?? []).map((p) => {
    const sc = p.service_categories as
      | { name_fi: string }
      | { name_fi: string }[]
      | null;
    const categoryName = Array.isArray(sc)
      ? (sc[0]?.name_fi ?? "—")
      : (sc?.name_fi ?? "—");
    return {
      id: p.id as string,
      title: p.title as string,
      status: p.status as ProjectStatus,
      municipality: p.municipality as string,
      postal_code: p.postal_code as string,
      created_at: p.created_at as string,
      published_at: p.published_at as string | null,
      customer_id: p.customer_id as string,
      customerEmail: emailById.get(p.customer_id as string) ?? "—",
      customerName: nameById.get(p.customer_id as string) ?? null,
      categoryName,
      bids: bidsByProject.get(p.id as string) ?? [],
      bidCount: (bidsByProject.get(p.id as string) ?? []).filter((b) =>
        COUNTABLE_BID_STATUSES.has(b.status),
      ).length,
    };
  });

  if (tila === "has_bids") {
    rows = rows.filter((r) => r.bidCount > 0);
  } else if (tila === "no_bids") {
    rows = rows.filter((r) => r.bidCount === 0);
  }

  return { rows, error: null };
}

export type AdminEligibleContractor = {
  id: string;
  company_name: string | null;
  email: string | null;
  /** Jo aktiivinen tarjous (lähetetty tai hyväksytty). */
  hasActiveBid: boolean;
};

export async function fetchEligibleContractorsForProject(
  projectId: string,
): Promise<{
  contractors: AdminEligibleContractor[];
  projectTitle: string;
  canRemind: boolean;
  error: string | null;
}> {
  const admin = createAdminClient();

  const { data: project, error: projectErr } = await admin
    .from("projects")
    .select("id, title, status, job_type_id, municipality, postal_code")
    .eq("id", projectId)
    .maybeSingle();

  if (projectErr || !project) {
    return {
      contractors: [],
      projectTitle: "",
      canRemind: false,
      error: projectErr?.message ?? "Pyyntöä ei löydy.",
    };
  }

  const canRemind = ["published", "receiving_bids"].includes(
    project.status as string,
  );

  const { data: jobMatches } = await admin
    .from("contractor_job_types")
    .select("contractor_id")
    .eq("job_type_id", project.job_type_id as string);

  const contractorIds = [
    ...new Set((jobMatches ?? []).map((r) => r.contractor_id as string)),
  ];

  if (contractorIds.length === 0) {
    return {
      contractors: [],
      projectTitle: project.title as string,
      canRemind,
      error: null,
    };
  }

  const [{ data: profiles }, { data: companies }, { data: bids }] =
    await Promise.all([
      admin
        .from("profiles")
        .select("id, role")
        .in("id", contractorIds)
        .eq("role", "contractor"),
      admin
        .from("contractor_profiles")
        .select("id, company_name")
        .in("id", contractorIds),
      admin
        .from("bids")
        .select("contractor_id, status")
        .eq("project_id", projectId)
        .in("contractor_id", contractorIds),
    ]);

  const activeBidByContractor = new Set(
    (bids ?? [])
      .filter((b) => ["submitted", "accepted"].includes(b.status as string))
      .map((b) => b.contractor_id as string),
  );

  const companyById = new Map(
    (companies ?? []).map((c) => [c.id as string, c.company_name as string | null]),
  );
  const emailById = await loadAuthEmails(admin, contractorIds);

  const contractors = (profiles ?? []).map((p) => ({
    id: p.id as string,
    company_name: companyById.get(p.id as string) ?? null,
    email: emailById.get(p.id as string) ?? null,
    hasActiveBid: activeBidByContractor.has(p.id as string),
  }));

  contractors.sort((a, b) => {
    if (a.hasActiveBid !== b.hasActiveBid) return a.hasActiveBid ? 1 : -1;
    return (a.company_name ?? a.email ?? "").localeCompare(
      b.company_name ?? b.email ?? "",
      "fi",
    );
  });

  return {
    contractors,
    projectTitle: project.title as string,
    canRemind,
    error: null,
  };
}

export type AdminProjectDetail = {
  id: string;
  title: string;
  description: string;
  status: ProjectStatus;
  municipality: string;
  postal_code: string;
  created_at: string;
  published_at: string | null;
  customerEmail: string;
  customerName: string | null;
  categoryName: string;
  bids: AdminBidSummary[];
};

export async function fetchAdminProjectById(
  projectId: string,
): Promise<AdminProjectDetail | null> {
  const admin = createAdminClient();

  const { data: project, error } = await admin
    .from("projects")
    .select(
      `
      id,
      title,
      description,
      status,
      municipality,
      postal_code,
      created_at,
      published_at,
      customer_id,
      service_categories ( name_fi )
    `,
    )
    .eq("id", projectId)
    .maybeSingle();

  if (error || !project) {
    if (error) {
      console.error("[fetchAdminProjectById]", error.code, error.message);
    }
    return null;
  }

  const { data: bids } = await admin
    .from("bids")
    .select(
      `
      id,
      project_id,
      status,
      amount_cents,
      offers_equipment,
      equipment_amount_cents,
      submitted_at,
      contractor_id,
      contractor_profiles ( company_name )
    `,
    )
    .eq("project_id", projectId)
    .order("submitted_at", { ascending: false, nullsFirst: false });

  const contractorIds = [
    ...new Set((bids ?? []).map((b) => b.contractor_id as string)),
  ];
  const contractorEmailById = await loadAuthEmails(admin, contractorIds);

  const { data: profile } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", project.customer_id as string)
    .maybeSingle();

  const { data: authUser } = await admin.auth.admin.getUserById(
    project.customer_id as string,
  );

  const sc = project.service_categories as
    | { name_fi: string }
    | { name_fi: string }[]
    | null;

  return {
    id: project.id as string,
    title: project.title as string,
    description: project.description as string,
    status: project.status as ProjectStatus,
    municipality: project.municipality as string,
    postal_code: project.postal_code as string,
    created_at: project.created_at as string,
    published_at: project.published_at as string | null,
    customerEmail: authUser?.user?.email ?? "—",
    customerName: profile?.full_name ?? null,
    categoryName: Array.isArray(sc)
      ? (sc[0]?.name_fi ?? "—")
      : (sc?.name_fi ?? "—"),
    bids: (bids ?? []).map((b) => ({
      id: b.id as string,
      project_id: b.project_id as string,
      status: b.status as string,
      amount_cents: b.amount_cents as number,
      offers_equipment: b.offers_equipment as boolean | null,
      equipment_amount_cents: b.equipment_amount_cents as number | null,
      company_name: contractorCompanyFromRow(
        b.contractor_profiles as
          | { company_name: string | null }
          | { company_name: string | null }[]
          | null,
      ),
      contractorEmail:
        contractorEmailById.get(b.contractor_id as string) ?? null,
      submitted_at: b.submitted_at as string | null,
    })),
  };
}
