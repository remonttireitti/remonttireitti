"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import {
  ADMIN_PREVIEW_COOKIE,
  adminPreviewCookieOptions,
  type AdminPreviewMode,
} from "@/lib/admin-preview";
import { contractorHomePath } from "@/lib/contractor-paths";

export type AdminPreviewActionState = {
  error?: string;
};

export async function setAdminPreviewMode(formData: FormData): Promise<void> {
  if (!(await isAdmin())) {
    redirect("/admin?viesti=ei-oikeuksia");
  }

  const mode = String(formData.get("mode") ?? "").trim();
  const redirectTo = String(formData.get("redirect") ?? "").trim();
  const cookieStore = await cookies();

  if (mode === "off") {
    cookieStore.delete(ADMIN_PREVIEW_COOKIE);
  } else if (mode === "customer" || mode === "contractor") {
    cookieStore.set(ADMIN_PREVIEW_COOKIE, mode, adminPreviewCookieOptions(mode));
  } else {
    redirect("/admin?viesti=virheellinen-tila");
  }

  revalidatePath("/", "layout");

  if (redirectTo.startsWith("/")) {
    redirect(redirectTo);
  }

  redirect(
    mode === "contractor"
      ? contractorHomePath()
      : mode === "customer"
        ? "/"
        : "/admin",
  );
}

export async function clearAdminPreviewMode() {
  if (!(await isAdmin())) return;
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_PREVIEW_COOKIE);
  revalidatePath("/", "layout");
}

