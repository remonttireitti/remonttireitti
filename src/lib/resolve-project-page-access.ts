import type { SupabaseClient } from "@supabase/supabase-js";
import {
  guestProjectToCustomerRow,
  readProjectAccessToken,
  resolveGuestProjectAccess,
} from "@/lib/project-guest-access";
import {
  fetchCustomerProjectById,
  type CustomerProjectRow,
} from "@/lib/projects-server";

export type ProjectPageAccess = {
  project: CustomerProjectRow;
  isGuestAccess: boolean;
  guestEmail: string | null;
  accessToken: string | null;
};

/**
 * Vieraslinkki voittaa aina kirjautuneen istunnon, jotta admin/urakoitsija-selain
 * ei näytä väärää roolia asiakkaan tarjouspyynnössä.
 */
export async function resolveProjectPageAccess(
  supabase: SupabaseClient,
  projectId: string,
  options: {
    userId?: string | null;
    urlToken?: string | null;
  },
): Promise<ProjectPageAccess | null> {
  const cookieToken = await readProjectAccessToken(projectId);
  const accessToken = options.urlToken ?? cookieToken ?? null;

  if (accessToken) {
    const guestRow = await resolveGuestProjectAccess(projectId, accessToken);
    if (guestRow) {
      return {
        project: guestProjectToCustomerRow(guestRow),
        isGuestAccess: true,
        guestEmail: (guestRow.guest_email as string | null) ?? null,
        accessToken,
      };
    }
  }

  if (options.userId) {
    const owned = await fetchCustomerProjectById(
      supabase,
      projectId,
      options.userId,
    );
    if (owned) {
      return {
        project: owned,
        isGuestAccess: false,
        guestEmail: null,
        accessToken: null,
      };
    }
  }

  return null;
}
