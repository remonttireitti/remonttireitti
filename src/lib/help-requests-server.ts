import type { SupabaseClient } from "@supabase/supabase-js";
import { postalCodeDistanceKm } from "@/lib/geo-distance";
import type {
  HelpOfferRow,
  HelpRequestRow,
  HelpRequestWithDistance,
} from "@/lib/help-requests-shared";
import { tryCreateAdminClient } from "@/lib/supabase/admin";

export type HelpRequesterContact = {
  fullName: string | null;
  phone: string | null;
  email: string | null;
};

export type HelpPrefs = {
  helpPostalCode: string | null;
  helpMunicipality: string | null;
  helpRadiusKm: number;
  notifyNearbyHelp: boolean;
  offerVoluntaryHelp: boolean;
  freeHelpsGiven: number;
  freeHelpsReceived: number;
};

export async function fetchHelpPrefs(
  supabase: SupabaseClient,
  userId: string,
): Promise<HelpPrefs> {
  const { data } = await supabase
    .from("profiles")
    .select(
      "help_postal_code, help_municipality, help_radius_km, notify_nearby_help, offer_voluntary_help, free_helps_given, free_helps_received",
    )
    .eq("id", userId)
    .maybeSingle();

  return {
    helpPostalCode: data?.help_postal_code ?? null,
    helpMunicipality: data?.help_municipality ?? null,
    helpRadiusKm: data?.help_radius_km ?? 5,
    notifyNearbyHelp: data?.notify_nearby_help ?? false,
    offerVoluntaryHelp: data?.offer_voluntary_help ?? false,
    freeHelpsGiven: data?.free_helps_given ?? 0,
    freeHelpsReceived: data?.free_helps_received ?? 0,
  };
}

export async function attachDistanceToHelpRequests(
  supabase: SupabaseClient,
  requests: HelpRequestRow[],
  viewerPostal: string | null,
): Promise<HelpRequestWithDistance[]> {
  if (!viewerPostal?.trim()) {
    return requests.map((r) => ({ ...r, distance_km: null }));
  }

  const distances = await Promise.all(
    requests.map((r) =>
      postalCodeDistanceKm(supabase, viewerPostal, r.postal_code),
    ),
  );

  return requests.map((r, i) => ({
    ...r,
    distance_km: distances[i],
  }));
}

export async function fetchOpenHelpRequests(
  supabase: SupabaseClient,
  opts: {
    viewerPostal?: string | null;
    maxRadiusKm?: number;
    excludeUserId?: string;
    limit?: number;
  },
): Promise<HelpRequestWithDistance[]> {
  const now = new Date().toISOString();
  let query = supabase
    .from("help_requests")
    .select("*")
    .eq("status", "open")
    .gt("expires_at", now)
    .order("urgency", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 50);

  if (opts.excludeUserId) {
    query = query.neq("requester_id", opts.excludeUserId);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[fetchOpenHelpRequests]", error.message);
    return [];
  }

  const sorted = ((data ?? []) as HelpRequestRow[]).sort((a, b) => {
    if (a.urgency !== b.urgency) {
      return a.urgency === "now" ? -1 : 1;
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const withDistance = await attachDistanceToHelpRequests(
    supabase,
    sorted,
    opts.viewerPostal ?? null,
  );

  if (opts.viewerPostal && opts.maxRadiusKm != null) {
    return withDistance.filter(
      (r) => r.distance_km != null && r.distance_km <= opts.maxRadiusKm!,
    );
  }

  return withDistance;
}

export async function countOpenHelpRequests(
  supabase: SupabaseClient,
): Promise<number> {
  const now = new Date().toISOString();
  const { count, error } = await supabase
    .from("help_requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "open")
    .gt("expires_at", now);

  if (error) {
    console.error("[countOpenHelpRequests]", error.message);
    return 0;
  }

  return count ?? 0;
}

/** Pyytäjän yhteystiedot — vain kirjautuneelle katsojalle (ei pyytäjälle). */
export async function fetchHelpRequesterContactForViewer(
  requesterId: string,
  viewerId: string | null,
): Promise<HelpRequesterContact | null> {
  if (!viewerId || viewerId === requesterId) return null;

  const admin = tryCreateAdminClient();
  if (!admin) return null;

  const [{ data: profile }, { data: authUser }] = await Promise.all([
    admin
      .from("profiles")
      .select("full_name, phone")
      .eq("id", requesterId)
      .maybeSingle(),
    admin.auth.admin.getUserById(requesterId),
  ]);

  return {
    fullName: profile?.full_name ?? null,
    phone: profile?.phone?.trim() || null,
    email: authUser?.user?.email ?? null,
  };
}

export async function fetchHelpRequestById(
  supabase: SupabaseClient,
  id: string,
): Promise<HelpRequestRow | null> {
  const { data, error } = await supabase
    .from("help_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return data as HelpRequestRow;
}

export async function fetchHelpOffersForRequest(
  supabase: SupabaseClient,
  requestId: string,
): Promise<HelpOfferRow[]> {
  const { data, error } = await supabase
    .from("help_offers")
    .select("*")
    .eq("request_id", requestId)
    .order("created_at", { ascending: true });

  if (error) return [];
  return (data ?? []) as HelpOfferRow[];
}

export async function fetchUserHelpRequests(
  supabase: SupabaseClient,
  userId: string,
): Promise<HelpRequestRow[]> {
  const { data } = await supabase
    .from("help_requests")
    .select("*")
    .eq("requester_id", userId)
    .order("created_at", { ascending: false })
    .limit(30);

  return (data ?? []) as HelpRequestRow[];
}

export async function fetchUserHelpOffers(
  supabase: SupabaseClient,
  userId: string,
): Promise<(HelpOfferRow & { help_requests: HelpRequestRow | null })[]> {
  const { data } = await supabase
    .from("help_offers")
    .select("*, help_requests (*)")
    .eq("helper_id", userId)
    .order("created_at", { ascending: false })
    .limit(30);

  return (data ?? []) as (HelpOfferRow & {
    help_requests: HelpRequestRow | null;
  })[];
}
