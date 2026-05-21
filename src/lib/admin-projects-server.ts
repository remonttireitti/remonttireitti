import { createAdminClient } from "@/lib/supabase/admin";
import type { ProjectStatus } from "@/types/database";

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
};

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
  } else if (tila === "draft") {
    query = query.eq("status", "draft");
  } else if (tila !== "all") {
    query = query.eq("status", tila);
  }

  const { data: projects, error } = await query;

  if (error) {
    console.error("[fetchAdminProjectsList]", error.code, error.message);
    return { rows: [], error: error.message };
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
      customer_id: p.customer_id as string,
      customerEmail: emailById.get(p.customer_id as string) ?? "—",
      customerName: nameById.get(p.customer_id as string) ?? null,
      categoryName,
      bidCount: bids?.length ?? 0,
    };
  });

  return { rows, error: null };
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
  bids: {
    id: string;
    status: string;
    amount_cents: number;
    company_name: string | null;
    created_at: string;
  }[];
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
      status,
      amount_cents,
      created_at,
      contractor_profiles ( company_name )
    `,
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

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
    bids: (bids ?? []).map((b) => {
      const cp = b.contractor_profiles as
        | { company_name: string | null }
        | { company_name: string | null }[]
        | null;
      const company = Array.isArray(cp)
        ? (cp[0]?.company_name ?? null)
        : (cp?.company_name ?? null);
      return {
        id: b.id as string,
        status: b.status as string,
        amount_cents: b.amount_cents as number,
        company_name: company,
        created_at: b.created_at as string,
      };
    }),
  };
}
