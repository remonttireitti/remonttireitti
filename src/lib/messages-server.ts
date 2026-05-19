import type { SupabaseClient } from "@supabase/supabase-js";

export type ChatMessage = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export type ProjectConversation = {
  id: string;
  customer_id: string;
  contractor_id: string;
};

export type ConversationWithMessages = {
  id: string;
  contractor_id: string;
  contractor_name: string;
  messages: ChatMessage[];
};

function contractorName(
  profiles: { company_name: string } | { company_name: string }[] | null,
): string {
  if (!profiles) return "Urakoitsija";
  if (Array.isArray(profiles)) return profiles[0]?.company_name ?? "Urakoitsija";
  return profiles.company_name;
}

export async function fetchContractorProjectConversation(
  supabase: SupabaseClient,
  projectId: string,
  contractorId: string,
  userId: string,
): Promise<{
  conversation: ProjectConversation;
  messages: ChatMessage[];
} | null> {
  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, customer_id, contractor_id")
    .eq("project_id", projectId)
    .eq("contractor_id", contractorId)
    .maybeSingle();

  if (!conversation) return null;

  if (
    conversation.customer_id !== userId &&
    conversation.contractor_id !== userId
  ) {
    return null;
  }

  const { data: messages } = await supabase
    .from("messages")
    .select("id, sender_id, body, created_at")
    .eq("conversation_id", conversation.id)
    .order("created_at", { ascending: true });

  return {
    conversation,
    messages: (messages ?? []) as ChatMessage[],
  };
}

/** @deprecated Käytä fetchContractorProjectConversation hyväksytyn urakoitsijan kanssa. */
export async function fetchProjectConversation(
  supabase: SupabaseClient,
  projectId: string,
  userId: string,
  contractorId?: string,
): Promise<{
  conversation: ProjectConversation;
  messages: ChatMessage[];
} | null> {
  if (!contractorId) return null;
  return fetchContractorProjectConversation(
    supabase,
    projectId,
    contractorId,
    userId,
  );
}

export async function fetchCustomerProjectConversations(
  supabase: SupabaseClient,
  projectId: string,
  customerId: string,
): Promise<ConversationWithMessages[]> {
  const { data: conversations } = await supabase
    .from("conversations")
    .select(
      `
      id,
      contractor_id,
      contractor_profiles ( company_name )
    `,
    )
    .eq("project_id", projectId)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: true });

  if (!conversations?.length) return [];

  const result: ConversationWithMessages[] = [];

  for (const row of conversations) {
    const { data: messages } = await supabase
      .from("messages")
      .select("id, sender_id, body, created_at")
      .eq("conversation_id", row.id)
      .order("created_at", { ascending: true });

    const msgs = (messages ?? []) as ChatMessage[];
    if (msgs.length === 0) continue;

    result.push({
      id: row.id,
      contractor_id: row.contractor_id,
      contractor_name: contractorName(
        row.contractor_profiles as
          | { company_name: string }
          | { company_name: string }[]
          | null,
      ),
      messages: msgs,
    });
  }

  return result;
}
