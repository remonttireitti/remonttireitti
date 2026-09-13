"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ensureProjectConversation } from "@/app/actions/messages";
import { parseGapTypes, gapTypeLabel } from "@/constants/completion-gap-types";
import { getProjectRequestTemplate } from "@/constants/project-request-templates";
import { criterionLabelFromTemplate } from "@/lib/template-criterion-stats";
import { uploadProjectPhotosFromFormData } from "@/lib/project-photos";
import { fetchProjectViewContractorIds } from "@/lib/project-views-server";
import {
  completionRequestInsertErrorMessage,
  incrementCompletionTemplateStats,
  persistCompletionRequest,
  tryCreateAdminClient,
} from "@/lib/completion-request-persist";
import { createClient } from "@/lib/supabase/server";
import {
  userNotifyProjectCompletionRequested,
  userNotifyProjectCompletionUpdated,
} from "@/lib/user-notify";
import { resolveProjectJobTypeSlug } from "@/lib/project-job-type";
import { sendGuestCompletionRequestEmail } from "@/lib/guest-project-email";
import {
  isGuestProject,
  resolveGuestProjectAccess,
  rotateGuestProjectAccessToken,
} from "@/lib/project-guest-access";

export type CompletionRequestActionState = { error?: string; ok?: string };

const BIDDING_STATUSES = ["published", "receiving_bids"] as const;

export async function requestProjectCompletion(
  _prev: CompletionRequestActionState,
  formData: FormData,
): Promise<CompletionRequestActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Kirjaudu sisään." };

  const projectId = String(formData.get("project_id") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  const suggestTemplate = formData.get("suggest_template") === "on";
  const criterionIds = formData
    .getAll("criterion_id")
    .map((v) => String(v))
    .filter(Boolean);
  const gapTypes = parseGapTypes(
    formData.getAll("gap_type").map((v) => String(v)),
  );

  const prelimMinRaw = String(formData.get("preliminary_min_euros") ?? "").trim();
  const prelimMaxRaw = String(formData.get("preliminary_max_euros") ?? "").trim();
  const preliminaryNote =
    String(formData.get("preliminary_note") ?? "").trim() || null;

  let preliminaryMinCents: number | null = null;
  let preliminaryMaxCents: number | null = null;
  if (prelimMinRaw) {
    const v = Number(prelimMinRaw);
    if (!Number.isFinite(v) || v <= 0) return { error: "Alustava min-hinta virheellinen." };
    preliminaryMinCents = Math.round(v * 100);
  }
  if (prelimMaxRaw) {
    const v = Number(prelimMaxRaw);
    if (!Number.isFinite(v) || v <= 0) return { error: "Alustava max-hinta virheellinen." };
    preliminaryMaxCents = Math.round(v * 100);
  }

  if (!projectId) return { error: "Pyyntö puuttuu." };
  if (gapTypes.length === 0 && criterionIds.length === 0) {
    return { error: "Valitse vähintään yksi puuttuva tieto." };
  }
  if (note.length < 10) {
    return { error: "Kerro mitä tarvitset tarjouksen tekemiseen (väh. 10 merkkiä)." };
  }

  const { data: project } = await supabase
    .from("projects")
    .select(
      "id, title, status, customer_id, guest_email, job_type_id, details, job_types ( slug )",
    )
    .eq("id", projectId)
    .maybeSingle();

  if (!project) return { error: "Tarjouspyyntöä ei löydy." };
  if (
    !(BIDDING_STATUSES as readonly string[]).includes(project.status as string)
  ) {
    return { error: "Pyyntö ei ole enää avoinna." };
  }

  const jobSlug =
    resolveProjectJobTypeSlug({
      job_type_id: project.job_type_id as string,
      job_types: project.job_types as
        | { slug: string }
        | { slug: string }[]
        | null,
      details: project.details as Record<string, unknown> | null,
    }) ?? "generic";

  const template = getProjectRequestTemplate(jobSlug);
  const lines: string[] = [];
  for (const g of gapTypes) {
    lines.push(`• ${gapTypeLabel(g)}`);
  }
  for (const id of criterionIds) {
    const { label } = criterionLabelFromTemplate(template, id);
    if (!lines.some((l) => l.includes(label))) {
      lines.push(`• ${label}`);
    }
  }

  const { data: contractorProfile } = await supabase
    .from("contractor_profiles")
    .select("company_name")
    .eq("id", user.id)
    .maybeSingle();

  const company = contractorProfile?.company_name ?? "Urakoitsija";

  let messageBody = `[Tarjouspyynnön täydennys]\n${company} tarvitsee lisätietoja tarkempaa tarjousta varten:\n\n${lines.join("\n")}\n\nMitä tarvitset tarjouksen tekemiseen?\n${note}`;

  if (preliminaryMinCents || preliminaryMaxCents) {
    const min = preliminaryMinCents ? Math.round(preliminaryMinCents / 100) : null;
    const max = preliminaryMaxCents ? Math.round(preliminaryMaxCents / 100) : null;
    messageBody += `\n\nAlustava arvio: ${min ?? "?"}–${max ?? "?"} €`;
    if (preliminaryNote) messageBody += `\n${preliminaryNote}`;
  }

  messageBody +=
    "\n\nAsiakas voi täydentää pyyntöä Remonttireitin täydennyssivulla. Voit silti tarjota nykyisillä tiedoilla.";

  if (messageBody.length > 4000) {
    return { error: "Pyyntö on liian pitkä. Lyhennä tekstiä." };
  }

  const guestProject = isGuestProject(project);
  let messageId: string | null = null;

  if (!guestProject) {
    await ensureProjectConversation(
      supabase,
      projectId,
      project.customer_id as string,
      user.id,
    );

    const { data: conversation } = await supabase
      .from("conversations")
      .select("id")
      .eq("project_id", projectId)
      .eq("contractor_id", user.id)
      .maybeSingle();

    if (!conversation) return { error: "Keskustelua ei voitu avata." };

    const { data: message, error: messageErr } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversation.id,
        sender_id: user.id,
        body: messageBody,
      })
      .select("id")
      .single();

    if (messageErr || !message) {
      return { error: "Viestin lähetys epäonnistui." };
    }

    messageId = message.id as string;
  }

  const { error: insertErr } = await persistCompletionRequest(supabase, {
    project_id: projectId,
    contractor_id: user.id,
    criterion_ids: criterionIds.length > 0 ? criterionIds : ["gap:other"],
    gap_types: gapTypes,
    note,
    suggest_template: suggestTemplate,
    preliminary_min_cents: preliminaryMinCents,
    preliminary_max_cents: preliminaryMaxCents,
    preliminary_note: preliminaryNote,
    message_id: messageId,
  });

  if (insertErr) {
    return { error: completionRequestInsertErrorMessage(insertErr) };
  }

  await incrementCompletionTemplateStats(supabase, {
    jobSlug,
    criterionIds,
    gapTypes,
    asSuggestion: suggestTemplate,
  });

  const criterionCount = gapTypes.length + criterionIds.length;

  try {
    if (guestProject && project.guest_email) {
      const rawToken = await rotateGuestProjectAccessToken(projectId);
      await sendGuestCompletionRequestEmail({
        to: project.guest_email as string,
        projectTitle: project.title as string,
        projectId,
        rawToken,
        contractorCompany: company,
        criterionCount,
      });
    } else {
      await userNotifyProjectCompletionRequested({
        customerId: project.customer_id as string,
        projectId,
        projectTitle: project.title as string,
        contractorCompany: company,
        criterionCount,
      });
    }
  } catch (err) {
    console.warn("[requestProjectCompletion] notify failed:", err);
  }

  revalidatePath(`/tarjoukset/${projectId}`);
  revalidatePath(`/remontti/${projectId}`);
  return { ok: "Täydennäpyyntö lähetetty asiakkaalle." };
}

export async function submitProjectCompletionUpdate(
  _prev: CompletionRequestActionState,
  formData: FormData,
): Promise<CompletionRequestActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const projectId = String(formData.get("project_id") ?? "");
  const descriptionAppend = String(formData.get("description_append") ?? "").trim();

  if (!projectId) return { error: "Pyyntö puuttuu." };

  let project: Record<string, unknown> | null = null;
  let isGuestUpdate = false;

  if (user) {
    const { data } = await supabase
      .from("projects")
      .select(
        "id, title, description, status, customer_id, content_revision, job_type_id, job_types ( slug ), details",
      )
      .eq("id", projectId)
      .eq("customer_id", user.id)
      .maybeSingle();
    project = data;
  } else {
    const guestRow = await resolveGuestProjectAccess(projectId);
    if (guestRow) {
      project = guestRow;
      isGuestUpdate = true;
    }
  }

  if (!project) return { error: "Pyyntöä ei löydy." };

  const editable = ["draft", "published", "receiving_bids"].includes(
    project.status as string,
  );
  if (!editable) return { error: "Pyyntöä ei voi enää täydentää." };

  const adminForGuest = isGuestUpdate ? tryCreateAdminClient() : null;
  if (isGuestUpdate && !adminForGuest) {
    return { error: "Vieraslinkin päivitys ei ole juuri nyt käytettävissä." };
  }
  const dataClient = adminForGuest ?? supabase;

  const { count: bidCount } = await dataClient
    .from("bids")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("status", "submitted");

  const hasSubmittedBids = (bidCount ?? 0) > 0;
  const nextRevision = hasSubmittedBids
    ? (project.content_revision as number) + 1
    : (project.content_revision as number);

  let newDescription = project.description as string;
  if (descriptionAppend) {
    newDescription = `${newDescription.trim()}\n\n--- Täydennys ---\n${descriptionAppend}`.trim();
  }

  const { error: updateErr } = await dataClient
    .from("projects")
    .update({
      description: newDescription,
      content_revision: nextRevision,
    })
    .eq("id", projectId);

  if (updateErr) return { error: "Päivitys epäonnistui." };

  try {
    await uploadProjectPhotosFromFormData(projectId, formData);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Kuvien lataus epäonnistui.";
    if (!msg.includes("Bucket not found") && !msg.includes("SUPABASE_SERVICE_ROLE")) {
      return { error: msg };
    }
  }

  await resolveProjectCompletionRequests(projectId);

  const summaryParts: string[] = [];
  if (descriptionAppend) summaryParts.push("päivitetty kuvaus");
  const files = formData
    .getAll("project_photos")
    .filter((f) => f instanceof File && f.size > 0);
  if (files.length > 0) summaryParts.push(`${files.length} uutta kuvaa`);

  const summary = summaryParts.length > 0 ? summaryParts.join(", ") : "tiedot täydennetty";

  const admin = tryCreateAdminClient();
  if (!admin) {
    revalidatePath(`/remontti/${projectId}`);
    revalidatePath(`/remontti/${projectId}/taydenna`);
    revalidatePath("/tarjoukset");
    revalidatePath(`/tarjoukset/${projectId}`);
    redirect(`/remontti/${projectId}?taydennetty=1`);
  }

  const { data: bidders } = await admin
    .from("bids")
    .select("contractor_id")
    .eq("project_id", projectId)
    .in("status", ["submitted", "draft"]);

  const viewedIds = await fetchProjectViewContractorIds(projectId);
  const { data: requesters } = await admin
    .from("project_completion_requests")
    .select("contractor_id")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(20);

  const notifyIds = new Set<string>([
    ...viewedIds,
    ...(bidders ?? []).map((b) => b.contractor_id as string),
    ...(requesters ?? []).map((r) => r.contractor_id as string),
  ]);

  for (const contractorId of notifyIds) {
    await userNotifyProjectCompletionUpdated({
      contractorId,
      projectId,
      projectTitle: project.title as string,
      summary,
    });
  }

  revalidatePath(`/remontti/${projectId}`);
  revalidatePath(`/remontti/${projectId}/taydenna`);
  revalidatePath("/tarjoukset");
  revalidatePath(`/tarjoukset/${projectId}`);
  redirect(`/remontti/${projectId}?taydennetty=1`);
}

export async function resolveProjectCompletionRequests(projectId: string): Promise<void> {
  const admin = tryCreateAdminClient();
  if (!admin) return;

  await admin
    .from("project_completion_requests")
    .update({ resolved_at: new Date().toISOString() })
    .eq("project_id", projectId)
    .is("resolved_at", null);
}
