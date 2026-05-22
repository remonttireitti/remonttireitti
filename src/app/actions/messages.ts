"use server";

import { userNotifyProjectMessage } from "@/lib/user-notify";
import { scheduleNotification } from "@/lib/schedule-notification";
import {
  isContactRestrictedProjectStatus,
  validateMessageContactRules,
} from "@/lib/message-content-guard";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type MessageActionState = { error?: string; success?: string };

const MESSAGING_STATUSES = [
  "published",
  "receiving_bids",
  "bid_accepted",
  "in_progress",
  "completed",
] as const;

export async function ensureProjectConversation(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
  customerId: string,
  contractorId: string,
): Promise<{ error?: string }> {
  const { error } = await supabase.from("conversations").insert({
    project_id: projectId,
    customer_id: customerId,
    contractor_id: contractorId,
  });

  if (error && error.code !== "23505") return { error: error.message };
  return {};
}

export async function sendProjectMessage(
  _prev: MessageActionState,
  formData: FormData,
): Promise<MessageActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Kirjaudu sisään." };

  const conversationId = String(formData.get("conversation_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const revalidatePaths = String(formData.get("revalidate_paths") ?? "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  if (!conversationId) return { error: "Puuttuva keskustelu." };
  if (body.length < 1) return { error: "Kirjoita viesti." };
  if (body.length > 4000) {
    return { error: "Viesti on liian pitkä (max 4000 merkkiä)." };
  }

  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, customer_id, contractor_id, project_id")
    .eq("id", conversationId)
    .single();

  if (!conversation) return { error: "Keskustelua ei löydy." };

  if (
    conversation.customer_id !== user.id &&
    conversation.contractor_id !== user.id
  ) {
    return { error: "Ei oikeutta." };
  }

  const { data: project } = await supabase
    .from("projects")
    .select("status, title")
    .eq("id", conversation.project_id)
    .single();

  if (
    !project ||
    !(MESSAGING_STATUSES as readonly string[]).includes(project.status)
  ) {
    return { error: "Viestintä ei ole käytössä tässä urakassa." };
  }

  const contactRestricted = isContactRestrictedProjectStatus(project.status);
  const contactCheck = validateMessageContactRules(body, contactRestricted);
  if (!contactCheck.ok) return { error: contactCheck.error };

  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: user.id,
    body,
  });

  if (error) {
    console.error("[sendProjectMessage]", error.code, error.message);
    return { error: "Viestin lähetys epäonnistui." };
  }

  const recipientId =
    user.id === conversation.customer_id
      ? conversation.contractor_id
      : conversation.customer_id;

  scheduleNotification(() =>
    userNotifyProjectMessage({
      recipientId,
      projectTitle: project.title ?? "Urakka",
      projectId: conversation.project_id,
      projectStatus: project.status,
      preview: body,
      recipientIsContractor: recipientId === conversation.contractor_id,
    }),
  );

  for (const path of revalidatePaths) {
    revalidatePath(path);
  }
  revalidatePath("/");
  revalidatePath(`/remontti/${conversation.project_id}`);
  revalidatePath(`/tarjoukset/${conversation.project_id}`);
  revalidatePath(`/tarjoukset/urakka/${conversation.project_id}`);

  return { success: "Lähetetty." };
}
