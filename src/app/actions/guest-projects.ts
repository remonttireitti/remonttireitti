"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  fetchGuestProjectByToken,
  generateProjectAccessToken,
  hashProjectAccessToken,
} from "@/lib/project-guest-access";
import {
  sendGuestProjectAccessEmail,
  sendGuestProjectVerificationEmail,
} from "@/lib/guest-project-email";
import {
  notifyContractorsNewMaintenanceProject,
  notifyContractorsNewPublishedProject,
} from "@/lib/contractor-project-notify";
import { scheduleNotification } from "@/lib/schedule-notification";
import {
  bidDeadlineFromDays,
  bidWindowDaysFromProjectDetails,
} from "@/lib/project-inactivity";
import { recordCustomJobDemand, fetchJobTypeSlug } from "@/lib/custom-job-demand";
import { isFreeFormJobSlug } from "@/constants/free-form-job";
import type { DeviceCategory } from "@/constants/maintenance";
import { isUnverifiedGuestProjectExpired } from "@/lib/guest-project-verification";
import { deleteUnverifiedGuestProject } from "@/lib/expire-unverified-guest-projects";

export async function publishGuestProjectAfterVerification(
  projectId: string,
  rawToken: string,
): Promise<{ error?: string; published?: boolean }> {
  const project = await fetchGuestProjectByToken(projectId, rawToken);
  if (!project) {
    return {
      error:
        "Vahvistuslinkki on vanhentunut tai virheellinen. Luo tarjouspyyntö uudelleen.",
    };
  }

  if (
    isUnverifiedGuestProjectExpired({
      email_verified_at: project.email_verified_at as string | null,
      created_at: project.created_at as string,
    })
  ) {
    await deleteUnverifiedGuestProject(projectId);
    return {
      error:
        "Vahvistuslinkki on vanhentunut (24 h). Luo tarjouspyyntö uudelleen.",
    };
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const pendingPublish = Boolean(project.pending_publish);
  const alreadyVerified = Boolean(project.email_verified_at);

  const updates: Record<string, unknown> = {
    email_verified_at: project.email_verified_at ?? now,
  };

  let published = false;

  if (pendingPublish && project.status === "draft") {
    updates.status = "published";
    updates.published_at = now;
    updates.bid_deadline = bidDeadlineFromDays(
      bidWindowDaysFromProjectDetails(project.details),
    );
    updates.pending_publish = false;
    published = true;
  }

  const { error } = await admin
    .from("projects")
    .update(updates)
    .eq("id", projectId)
    .eq("access_token_hash", hashProjectAccessToken(rawToken));

  if (error) {
    console.error("[publishGuestProjectAfterVerification]", error.message);
    return { error: "Vahvistus epäonnistui." };
  }

  if (published && !alreadyVerified) {
    const details = project.details as Record<string, unknown> | null;
    const maintenance = details?.laitteen_huolto as
      | { device_category?: string }
      | undefined;

    if (maintenance?.device_category) {
      scheduleNotification(() =>
        notifyContractorsNewMaintenanceProject({
          projectId,
          projectTitle: project.title as string,
          jobTypeId: project.job_type_id as string,
          deviceCategory: maintenance.device_category as DeviceCategory,
          municipality: project.municipality as string,
          postalCode: project.postal_code as string,
        }),
      );
    } else {
      scheduleNotification(() =>
        notifyContractorsNewPublishedProject({
          projectId,
          projectTitle: project.title as string,
          jobTypeId: project.job_type_id as string,
          municipality: project.municipality as string,
          postalCode: project.postal_code as string,
          budgetMin: project.budget_min as number | null,
          budgetMax: project.budget_max as number | null,
        }),
      );
    }

    const jobTypeSlug = await fetchJobTypeSlug(
      admin,
      project.job_type_id as string,
    );
    if (isFreeFormJobSlug(jobTypeSlug)) {
      await recordCustomJobDemand(
        admin,
        projectId,
        jobTypeSlug,
        project.title as string,
        details ?? {},
      );
    }
  }

  revalidatePath(`/remontti/${projectId}`);
  revalidatePath("/tarjoukset");
  revalidatePath("/oma-tili");

  return { published };
}

export async function issueGuestProjectAccess(params: {
  projectId: string;
  guestEmail: string;
  projectTitle: string;
  pendingPublish: boolean;
  existingTokenHash?: string | null;
}): Promise<{ rawToken: string; hash: string }> {
  const { raw, hash } = generateProjectAccessToken();
  const admin = createAdminClient();

  await admin
    .from("projects")
    .update({ access_token_hash: hash, guest_email: params.guestEmail })
    .eq("id", params.projectId);

  if (params.pendingPublish) {
    await sendGuestProjectVerificationEmail({
      to: params.guestEmail,
      projectTitle: params.projectTitle,
      projectId: params.projectId,
      rawToken: raw,
      pendingPublish: true,
    });
  } else {
    await sendGuestProjectVerificationEmail({
      to: params.guestEmail,
      projectTitle: params.projectTitle,
      projectId: params.projectId,
      rawToken: raw,
      pendingPublish: false,
    });
  }

  return { rawToken: raw, hash };
}
