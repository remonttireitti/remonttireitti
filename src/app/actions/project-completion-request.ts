"use server";

import { revalidatePath } from "next/cache";
import { ensureProjectConversation } from "@/app/actions/messages";
import {
  criterionLabelFromTemplate,
} from "@/lib/template-criterion-stats";
import { getProjectRequestTemplate } from "@/constants/project-request-templates";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { userNotifyProjectCompletionRequested } from "@/lib/user-notify";
import { resolveProjectJobTypeSlug } from "@/lib/project-job-type";

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
  const note = String(formData.get("note") ?? "").trim() || null;
  const criterionIds = formData
    .getAll("criterion_id")
    .map((v) => String(v))
    .filter(Boolean);

  if (!projectId) return { error: "Pyyntö puuttuu." };
  if (criterionIds.length === 0) {
    return { error: "Valitse vähintään yksi puuttuva tieto." };
  }

  const { data: project } = await supabase
    .from("projects")
    .select(
      "id, title, status, customer_id, job_type_id, details, job_types ( slug )",
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
  const bulletLines = criterionIds.map((id) => {
    const { label, tip } = criterionLabelFromTemplate(template, id);
    return `• ${label} — ${tip}`;
  });

  const { data: contractorProfile } = await supabase
    .from("contractor_profiles")
    .select("company_name")
    .eq("id", user.id)
    .maybeSingle();

  const company = contractorProfile?.company_name ?? "Urakoitsija";

  let messageBody = `[Täydennäpyyntö]\n${company} pyytää täydentämään tarjouspyyntöä tarkempaa tarjousta varten:\n\n${bulletLines.join("\n")}`;

  if (note) {
    messageBody += `\n\nLisähuomio: ${note}`;
  }

  messageBody +=
    "\n\nVoit täydentää pyyntöä projektisivulta. Voit silti saada tarjouksen jo nyt — täydennetty pyyntö helpottaa tarkempaa hinnoittelua.";

  if (messageBody.length > 4000) {
    return { error: "Pyyntö on liian pitkä. Valitse vähemmän kohtia." };
  }

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

  const admin = createAdminClient();
  const { error: insertErr } = await admin.from("project_completion_requests").insert({
    project_id: projectId,
    contractor_id: user.id,
    criterion_ids: criterionIds,
    note,
    message_id: message.id,
  });

  if (insertErr) {
    return { error: "Täydennäpyynnön tallennus epäonnistui." };
  }

  await admin.rpc("increment_template_criterion_stats", {
    p_job_slug: jobSlug,
    p_criterion_ids: criterionIds,
  });

  await userNotifyProjectCompletionRequested({
    customerId: project.customer_id as string,
    projectId,
    projectTitle: project.title as string,
    contractorCompany: company,
    criterionCount: criterionIds.length,
  });

  revalidatePath(`/tarjoukset/${projectId}`);
  revalidatePath(`/remontti/${projectId}`);
  return { ok: "Täydennäpyyntö lähetetty asiakkaalle." };
}

export async function resolveProjectCompletionRequests(projectId: string): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("project_completion_requests")
    .update({ resolved_at: new Date().toISOString() })
    .eq("project_id", projectId)
    .is("resolved_at", null);
}
