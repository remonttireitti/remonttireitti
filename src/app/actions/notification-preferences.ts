"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";

export type NotificationPrefsState = { error?: string; ok?: string };

export async function updateNotificationPreferences(
  _prev: NotificationPrefsState,
  formData: FormData,
): Promise<NotificationPrefsState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/kirjaudu");

  const profile = await getProfile();
  if (!profile) return { error: "Profiilia ei löydy." };

  const notifyInApp = formData.get("notify_in_app") === "on";
  const notifyEmail = formData.get("notify_email") === "on";
  const notifyAdminNewUsers =
    profile.role === "admin" && formData.get("notify_admin_new_users") === "on";
  const notifyNewProjects =
    profile.role === "contractor" && formData.get("notify_new_projects") === "on";

  const patch: Record<string, boolean> = {
    notify_in_app: notifyInApp,
    notify_email: notifyEmail,
  };

  if (profile.role === "admin") {
    patch.notify_admin_new_users = notifyAdminNewUsers;
  }
  if (profile.role === "contractor") {
    patch.notify_new_projects = notifyNewProjects;
  }

  const { error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", user.id);

  if (error) return { error: "Tallennus epäonnistui." };

  revalidatePath("/oma-tili");
  revalidatePath("/admin");
  return { ok: "Ilmoitusasetukset tallennettu." };
}
