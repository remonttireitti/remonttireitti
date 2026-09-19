import { cookies } from "next/headers";
import { isAdmin } from "@/lib/admin";
import { isContractor, getProfile } from "@/lib/auth";

export type AdminPreviewMode = "customer" | "contractor";

export const ADMIN_PREVIEW_COOKIE = "rr_admin_preview";

const COOKIE_MAX_AGE = 60 * 60 * 8; // 8 h

export function adminPreviewCookieOptions(mode: AdminPreviewMode) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  };
}

/** Adminin valitsema esikatselutila (null = ei esikatselua). */
export async function getAdminPreviewMode(): Promise<AdminPreviewMode | null> {
  if (!(await isAdmin())) return null;
  const cookieStore = await cookies();
  const value = cookieStore.get(ADMIN_PREVIEW_COOKIE)?.value;
  if (value === "customer" || value === "contractor") return value;
  return null;
}

export async function isAdminPreviewActive(): Promise<boolean> {
  return (await getAdminPreviewMode()) !== null;
}

/** Onko admin parhaillaan esikatselutilassa (projekti/tarjous merkitään testiksi). */
export async function isAdminPreviewSubmission(): Promise<boolean> {
  return (await getAdminPreviewMode()) !== null;
}

export async function isEffectiveContractor(): Promise<boolean> {
  const preview = await getAdminPreviewMode();
  if (preview === "contractor") return true;
  if (preview === "customer") return false;
  return isContractor();
}

export async function isEffectiveCustomer(): Promise<boolean> {
  const preview = await getAdminPreviewMode();
  if (preview === "customer") return true;
  if (preview === "contractor") return false;
  const profile = await getProfile();
  const contractor = await isContractor();
  return !!profile && profile.role === "customer" && !contractor;
}

export async function canBrowseAsCustomer(): Promise<boolean> {
  const preview = await getAdminPreviewMode();
  if (preview === "customer") return true;
  if (preview === "contractor") return false;
  if (await isAdmin()) return false;
  const contractor = await isContractor();
  return !contractor;
}

export async function canBrowseAsContractor(): Promise<boolean> {
  const preview = await getAdminPreviewMode();
  if (preview === "contractor") return true;
  if (preview === "customer") return false;
  if (await isAdmin()) return false;
  return isContractor();
}

/** Yrityksen hinnasto, pätevyydet ja brändäys — ei adminille (ei myöskään admin+urakoitsija ilman esikatselua). */
export async function canManageContractorCompanySettings(): Promise<boolean> {
  const preview = await getAdminPreviewMode();
  if (preview === "contractor") return true;
  if (await isAdmin()) return false;
  return isContractor();
}

export function adminPreviewModeLabel(mode: AdminPreviewMode): string {
  return mode === "customer" ? "asiakkaana" : "urakoitsijana";
}

export function adminPreviewRedirectForMode(mode: AdminPreviewMode): string {
  return mode === "contractor" ? "/tarjoukset" : "/";
}
