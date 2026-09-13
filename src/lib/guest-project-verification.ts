/** Vahvistamaton vieraspyyntö vanhenee tämän jälkeen. */
export const GUEST_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

export function isUnverifiedGuestProjectExpired(project: {
  email_verified_at?: string | null;
  created_at?: string | null;
}): boolean {
  if (project.email_verified_at) return false;
  if (!project.created_at) return false;
  const created = new Date(project.created_at).getTime();
  if (Number.isNaN(created)) return false;
  return Date.now() - created > GUEST_VERIFICATION_TTL_MS;
}
