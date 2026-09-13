import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import type { CustomerProjectRow } from "@/lib/projects-server";

const COOKIE_PREFIX = "rr_pa_";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 90; // 90 days

export type ProjectAccessContext =
  | { kind: "user"; userId: string }
  | { kind: "guest"; projectId: string; guestEmail: string };

export function hashProjectAccessToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

export function generateProjectAccessToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString("base64url");
  return { raw, hash: hashProjectAccessToken(raw) };
}

export function projectAccessCookieName(projectId: string): string {
  return `${COOKIE_PREFIX}${projectId}`;
}

export function projectAccessCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  };
}

export function appendProjectAccessCookie(
  response: NextResponse,
  projectId: string,
  rawToken: string,
): NextResponse {
  response.cookies.set(
    projectAccessCookieName(projectId),
    rawToken,
    projectAccessCookieOptions(),
  );
  return response;
}

export async function setProjectAccessCookie(
  projectId: string,
  rawToken: string,
): Promise<void> {
  const jar = await cookies();
  jar.set(
    projectAccessCookieName(projectId),
    rawToken,
    projectAccessCookieOptions(),
  );
}

export async function readProjectAccessToken(
  projectId: string,
): Promise<string | null> {
  const jar = await cookies();
  return jar.get(projectAccessCookieName(projectId))?.value ?? null;
}

export async function fetchGuestProjectByToken(
  projectId: string,
  rawToken: string,
): Promise<Record<string, unknown> | null> {
  const admin = tryCreateAdminClient();
  if (!admin) return null;

  const hash = hashProjectAccessToken(rawToken);
  const { data, error } = await admin
    .from("projects")
    .select(
      `
      *,
      service_categories ( name_fi ),
      job_types ( slug )
    `,
    )
    .eq("id", projectId)
    .eq("access_token_hash", hash)
    .is("customer_id", null)
    .maybeSingle();

  if (error) {
    console.error("[fetchGuestProjectByToken]", error.code, error.message);
    return null;
  }

  return data;
}

export async function resolveGuestProjectAccess(
  projectId: string,
  rawToken?: string | null,
): Promise<Record<string, unknown> | null> {
  const token = rawToken ?? (await readProjectAccessToken(projectId));
  if (!token) return null;
  return fetchGuestProjectByToken(projectId, token);
}

export function guestProjectToCustomerRow(
  row: Record<string, unknown>,
): CustomerProjectRow {
  const sc = row.service_categories;
  return {
    id: row.id as string,
    title: row.title as string,
    description: row.description as string,
    details: row.details,
    status: row.status as string,
    municipality: row.municipality as string,
    postal_code: row.postal_code as string,
    address_line: (row.address_line as string | null) ?? null,
    contact_email: (row.contact_email as string | null) ?? null,
    contact_phone: (row.contact_phone as string | null) ?? null,
    budget_min: (row.budget_min as number | null) ?? null,
    budget_max: (row.budget_max as number | null) ?? null,
    desired_start: (row.desired_start as string | null) ?? null,
    published_at: (row.published_at as string | null) ?? null,
    bid_deadline: (row.bid_deadline as string | null) ?? null,
    inactivity_warning_sent_at:
      (row.inactivity_warning_sent_at as string | null) ?? null,
    auto_closed_at: (row.auto_closed_at as string | null) ?? null,
    content_revision: (row.content_revision as number | undefined) ?? 1,
    accepted_bid_id: (row.accepted_bid_id as string | null) ?? null,
    service_categories: sc as CustomerProjectRow["service_categories"],
  };
}

export function isGuestProject(row: {
  customer_id?: string | null;
  guest_email?: string | null;
}): boolean {
  return row.customer_id == null && Boolean(row.guest_email);
}

/** Uusi linkki sähköpostiin — vanha token vanhenee. */
export async function rotateGuestProjectAccessToken(
  projectId: string,
): Promise<string> {
  const raw = await tryRotateGuestProjectAccessToken(projectId);
  if (!raw) {
    throw new Error("Guest access token rotation unavailable");
  }
  return raw;
}

/** Palauttaa tokenin tai null — ei heitä poikkeusta (sähköposti / server action). */
export async function tryRotateGuestProjectAccessToken(
  projectId: string,
): Promise<string | null> {
  try {
    const { raw, hash } = generateProjectAccessToken();
    const admin = tryCreateAdminClient();
    if (!admin) return null;

    const { error } = await admin
      .from("projects")
      .update({ access_token_hash: hash })
      .eq("id", projectId)
      .is("customer_id", null);

    if (error) {
      console.error("[tryRotateGuestProjectAccessToken]", error.code, error.message);
      return null;
    }

    return raw;
  } catch (err) {
    console.error("[tryRotateGuestProjectAccessToken]", err);
    return null;
  }
}
