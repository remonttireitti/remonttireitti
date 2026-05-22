import { createAdminClient } from "@/lib/supabase/admin";
import { REVIEW_REMINDER_DAYS } from "@/lib/contractor-trust";
import { userNotifyReviewReminder } from "@/lib/user-notify";

/** Lähettää arvostelumuistutuksen valmiille urakoille ilman arvostelua. */
export async function sendDueReviewReminders(): Promise<number> {
  const admin = createAdminClient();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - REVIEW_REMINDER_DAYS);

  const { data: projects } = await admin
    .from("projects")
    .select("id, customer_id, title, completed_at")
    .eq("status", "completed")
    .is("review_reminder_sent_at", null)
    .not("completed_at", "is", null)
    .lte("completed_at", cutoff.toISOString());

  let sent = 0;

  for (const project of projects ?? []) {
    const { data: existingReview } = await admin
      .from("reviews")
      .select("id")
      .eq("project_id", project.id)
      .maybeSingle();

    if (existingReview) {
      await admin
        .from("projects")
        .update({ review_reminder_sent_at: new Date().toISOString() })
        .eq("id", project.id);
      continue;
    }

    const { data: bid } = await admin
      .from("bids")
      .select("contractor_profiles ( company_name )")
      .eq("project_id", project.id)
      .eq("status", "accepted")
      .maybeSingle();

    const cp = bid?.contractor_profiles as
      | { company_name: string }
      | { company_name: string }[]
      | null
      | undefined;
    const contractorName = Array.isArray(cp)
      ? cp[0]?.company_name
      : cp?.company_name;

    await userNotifyReviewReminder({
      customerId: project.customer_id,
      projectId: project.id,
      projectTitle: project.title,
      contractorName: contractorName ?? "Urakoitsija",
    });

    await admin
      .from("projects")
      .update({ review_reminder_sent_at: new Date().toISOString() })
      .eq("id", project.id);

    sent += 1;
  }

  return sent;
}
