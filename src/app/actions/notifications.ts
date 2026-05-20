"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function markNotificationRead(
  notificationId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Kirjaudu sisään." };

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", user.id);

  if (error) return { error: "Ilmoituksen merkintä epäonnistui." };

  revalidatePath("/");
  revalidatePath("/oma-tili");
  return {};
}

export async function markAllNotificationsRead(): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Kirjaudu sisään." };

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null)
    .is("archived_at", null);

  if (error) return { error: "Ilmoitusten merkintä epäonnistui." };

  revalidatePath("/");
  revalidatePath("/oma-tili");
  return {};
}

export async function archiveNotification(
  notificationId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Kirjaudu sisään." };

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("notifications")
    .update({ archived_at: now })
    .eq("id", notificationId)
    .eq("user_id", user.id)
    .is("archived_at", null);

  if (error) return { error: "Arkistointi epäonnistui." };

  revalidatePath("/");
  revalidatePath("/oma-tili");
  return {};
}

/** Arkistoi kaikki luetut ilmoitukset kerralla. */
export async function archiveReadNotifications(): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Kirjaudu sisään." };

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("notifications")
    .update({ archived_at: now })
    .eq("user_id", user.id)
    .not("read_at", "is", null)
    .is("archived_at", null);

  if (error) return { error: "Arkistointi epäonnistui." };

  revalidatePath("/");
  revalidatePath("/oma-tili");
  return {};
}
