import { getProfile } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function isAdmin(): Promise<boolean> {
  const profile = await getProfile();
  return profile?.role === "admin";
}

export async function requireAdmin() {
  const ok = await isAdmin();
  if (!ok) redirect("/oma-tili?viesti=ei-oikeuksia");
}
