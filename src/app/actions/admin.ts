"use server";

import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import type { UserRole } from "@/types/database";

export type AdminState = { error?: string; ok?: string };

export async function setUserRole(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await requireAdmin();

  const userId = String(formData.get("user_id") ?? "");
  const role = String(formData.get("role") ?? "") as UserRole;

  if (!userId || !["customer", "contractor", "admin"].includes(role)) {
    return { error: "Virheelliset tiedot." };
  }

  const admin = createAdminClient();

  const { error } = await admin
    .from("profiles")
    .update({ role })
    .eq("id", userId);

  if (error) return { error: "Roolin päivitys epäonnistui." };

  if (role === "contractor") {
    const company =
      String(formData.get("company_name") ?? "").trim() ||
      "Yritys (täydennä profiilissa)";
    await admin.from("contractor_profiles").upsert({
      id: userId,
      company_name: company,
    });
    await admin.auth.admin.updateUserById(userId, {
      user_metadata: { role: "contractor", company_name: company },
    });
  }

  if (role === "customer") {
    await admin.from("contractor_profiles").delete().eq("id", userId);
    await admin.auth.admin.updateUserById(userId, {
      user_metadata: { role: "customer" },
    });
  }

  revalidatePath("/admin");
  return { ok: "Rooli päivitetty." };
}

export async function fixAsContractor(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await requireAdmin();

  const userId = String(formData.get("user_id") ?? "");
  const company =
    String(formData.get("company_name") ?? "").trim() ||
    "Yritys (täydennä profiilissa)";

  if (!userId) return { error: "Käyttäjä puuttuu." };

  const admin = createAdminClient();

  await admin.from("profiles").update({ role: "contractor" }).eq("id", userId);
  await admin.from("contractor_profiles").upsert({
    id: userId,
    company_name: company,
  });
  await admin.auth.admin.updateUserById(userId, {
    user_metadata: { role: "contractor", company_name: company },
  });

  revalidatePath("/admin");
  return { ok: "Urakoitsija korjattu." };
}

export async function deleteUser(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await requireAdmin();

  const userId = String(formData.get("user_id") ?? "");
  if (!userId) return { error: "Käyttäjä puuttuu." };

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);

  if (error) return { error: "Poisto epäonnistui: " + error.message };

  revalidatePath("/admin");
  return { ok: "Käyttäjä poistettu." };
}
