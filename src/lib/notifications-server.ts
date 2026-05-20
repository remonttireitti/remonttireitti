import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AppNotification, NotificationType } from "@/lib/notifications";

export async function createNotification(params: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  linkPath: string;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("notifications").insert({
      user_id: params.userId,
      type: params.type,
      title: params.title,
      body: params.body,
      link_path: params.linkPath,
    });
    if (error) {
      console.error("[createNotification]", error.code, error.message);
    }
  } catch (err) {
    console.error("[createNotification]", err);
  }
}

export async function fetchUserNotifications(
  supabase: SupabaseClient,
  userId: string,
  limit = 15,
): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("id, type, title, body, link_path, read_at, created_at")
    .eq("user_id", userId)
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[fetchUserNotifications]", error.code, error.message);
    return [];
  }

  return (data ?? []) as AppNotification[];
}

export async function countUnreadNotifications(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null)
    .is("archived_at", null);

  if (error) {
    console.error("[countUnreadNotifications]", error.code, error.message);
    return 0;
  }

  return count ?? 0;
}
