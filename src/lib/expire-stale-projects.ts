import { createAdminClient } from "@/lib/supabase/admin";
import {
  PROJECT_AUTO_CLOSE_REJECTION_MESSAGE,
  PROJECT_INACTIVITY_STATUSES,
  projectAutoCloseAt,
  projectInactivityWarningAt,
} from "@/lib/project-inactivity";
import {
  userNotifyProjectAutoClosed,
  userNotifyProjectInactivityWarning,
  userNotifyProjectCancelled,
} from "@/lib/user-notify";

export type ExpireStaleProjectResult =
  | "not_applicable"
  | "still_active"
  | "warned"
  | "closed";

type StaleProjectRow = {
  id: string;
  customer_id: string;
  title: string;
  status: string;
  bid_deadline: string | null;
  published_at: string | null;
  inactivity_warning_sent_at: string | null;
  auto_closed_at: string | null;
};

async function fetchOpenBids(admin: ReturnType<typeof createAdminClient>, projectId: string) {
  const { data } = await admin
    .from("bids")
    .select("id, contractor_id, status")
    .eq("project_id", projectId)
    .in("status", ["submitted", "draft"]);
  return data ?? [];
}

async function rejectOpenBids(
  admin: ReturnType<typeof createAdminClient>,
  projectId: string,
  rejectionMessage: string,
) {
  const now = new Date().toISOString();
  await admin
    .from("bids")
    .update({
      status: "rejected",
      rejection_message: rejectionMessage,
      rejected_at: now,
      counter_status: null,
      counter_amount_cents: null,
      counter_message: null,
      counter_offered_at: null,
    })
    .eq("project_id", projectId)
    .in("status", ["submitted", "draft"]);
}

/** Varoitus + sulkeminen yhdelle avoimelle tarjouspyynnölle. */
export async function expireStaleProjectById(
  projectId: string,
): Promise<ExpireStaleProjectResult> {
  const admin = createAdminClient();

  const { data: project } = await admin
    .from("projects")
    .select(
      "id, customer_id, title, status, bid_deadline, published_at, inactivity_warning_sent_at, auto_closed_at",
    )
    .eq("id", projectId)
    .maybeSingle();

  if (!project) return "not_applicable";

  return expireStaleProjectRow(admin, project as StaleProjectRow);
}

async function expireStaleProjectRow(
  admin: ReturnType<typeof createAdminClient>,
  project: StaleProjectRow,
): Promise<ExpireStaleProjectResult> {
  if (
    !PROJECT_INACTIVITY_STATUSES.includes(
      project.status as (typeof PROJECT_INACTIVITY_STATUSES)[number],
    )
  ) {
    return "not_applicable";
  }

  const now = Date.now();
  const closeAt = projectAutoCloseAt(project);
  if (!closeAt) return "not_applicable";

  if (now >= closeAt.getTime() && !project.auto_closed_at) {
    const openBids = await fetchOpenBids(admin, project.id);

    await rejectOpenBids(
      admin,
      project.id,
      PROJECT_AUTO_CLOSE_REJECTION_MESSAGE,
    );

    const closedAt = new Date().toISOString();
    await admin
      .from("projects")
      .update({
        status: "cancelled",
        auto_closed_at: closedAt,
      })
      .eq("id", project.id);

    await userNotifyProjectAutoClosed({
      customerId: project.customer_id,
      projectId: project.id,
      projectTitle: project.title,
      closedAt: closeAt.toISOString(),
    });

    for (const bid of openBids) {
      await userNotifyProjectCancelled({
        contractorId: bid.contractor_id,
        projectTitle: project.title,
        projectId: project.id,
        autoClosed: true,
      });
    }

    return "closed";
  }

  const warningAt = projectInactivityWarningAt(project);
  if (
    warningAt &&
    now >= warningAt.getTime() &&
    now < closeAt.getTime() &&
    !project.inactivity_warning_sent_at
  ) {
    await userNotifyProjectInactivityWarning({
      customerId: project.customer_id,
      projectId: project.id,
      projectTitle: project.title,
      closeAt: closeAt.toISOString(),
    });

    await admin
      .from("projects")
      .update({ inactivity_warning_sent_at: new Date().toISOString() })
      .eq("id", project.id);

    return "warned";
  }

  return "still_active";
}

/** Cron: varoitukset ja sulkemiset kaikille vanhentuneille pyynnöille. */
export async function expireAllStaleProjects(): Promise<{
  warned: number;
  closed: number;
}> {
  const admin = createAdminClient();
  const { data: projects } = await admin
    .from("projects")
    .select(
      "id, customer_id, title, status, bid_deadline, published_at, inactivity_warning_sent_at, auto_closed_at",
    )
    .in("status", [...PROJECT_INACTIVITY_STATUSES]);

  let warned = 0;
  let closed = 0;

  for (const project of projects ?? []) {
    const result = await expireStaleProjectRow(
      admin,
      project as StaleProjectRow,
    );
    if (result === "warned") warned += 1;
    if (result === "closed") closed += 1;
  }

  return { warned, closed };
}

/** Lazy-ajo sivulatauksella (kehitys ilman cronia). */
export async function expireStaleProjectIfNeeded(projectId: string) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return "not_applicable" as const;

  try {
    return await expireStaleProjectById(projectId);
  } catch (err) {
    console.error("[expireStaleProjectIfNeeded]", projectId, err);
    return "not_applicable" as const;
  }
}
