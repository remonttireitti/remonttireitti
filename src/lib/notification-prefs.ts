import { createAdminClient } from "@/lib/supabase/admin";

export type NotificationPrefs = {
  notifyInApp: boolean;
  notifyEmail: boolean;
  notifyAdminNewUsers: boolean;
  notifyNewProjects: boolean;
};

const defaults: NotificationPrefs = {
  notifyInApp: true,
  notifyEmail: true,
  notifyAdminNewUsers: true,
  notifyNewProjects: true,
};

export async function getNotificationPrefs(
  userId: string,
): Promise<NotificationPrefs> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select(
      "notify_in_app, notify_email, notify_admin_new_users, notify_new_projects",
    )
    .eq("id", userId)
    .maybeSingle();

  if (!data) return defaults;

  return {
    notifyInApp: data.notify_in_app ?? true,
    notifyEmail: data.notify_email ?? true,
    notifyAdminNewUsers: data.notify_admin_new_users ?? true,
    notifyNewProjects: data.notify_new_projects ?? true,
  };
}

export function adminNewUsersGloballyDisabled(): boolean {
  return process.env.ADMIN_NOTIFY_NEW_USERS === "false";
}
