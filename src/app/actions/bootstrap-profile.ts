"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UserRole } from "@/types/database";

function roleFromMetadata(user: {
  user_metadata?: Record<string, unknown>;
}): UserRole {
  const r = user.user_metadata?.role as string | undefined;
  if (r === "contractor" || r === "admin" || r === "customer") return r;
  if (user.user_metadata?.company_name) return "contractor";
  return "customer";
}

/** Korjaa profiles-rivi kirjautuneelle käyttäjälle (ohittaa RLS). */
export async function bootstrapProfile() {
  const user = await getSessionUser();
  if (!user) redirect("/kirjaudu");

  let role = roleFromMetadata(user);
  const bootstrapAdminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim();
  if (bootstrapAdminEmail && user.email === bootstrapAdminEmail) {
    role = "admin";
  }

  const fullName =
    (typeof user.user_metadata?.full_name === "string" &&
      user.user_metadata.full_name) ||
    (typeof user.user_metadata?.name === "string" && user.user_metadata.name) ||
    null;

  const admin = createAdminClient();

  const { error } = await admin.from("profiles").upsert(
    {
      id: user.id,
      role,
      full_name: fullName,
      avatar_url:
        (user.user_metadata?.avatar_url as string | undefined) ?? null,
    },
    { onConflict: "id" },
  );

  if (error) {
    redirect(`/oma-tili?viesti=profiili-virhe&virhe=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/oma-tili");
  revalidatePath("/admin");
  redirect("/oma-tili");
}
