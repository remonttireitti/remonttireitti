import { createAdminClient } from "@/lib/supabase/admin";

const SKIP_PREFIXES = ["/admin", "/api", "/_next", "/auth"];

export function shouldTrackPageView(path: string): boolean {
  if (!path.startsWith("/") || path.length > 500) return false;
  return !SKIP_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

export async function insertPageView(input: {
  path: string;
  referrer: string | null;
  userId: string | null;
  sessionId: string;
}): Promise<void> {
  if (!shouldTrackPageView(input.path)) return;
  if (!input.sessionId || input.sessionId.length > 64) return;

  const admin = createAdminClient();
  await admin.from("page_views").insert({
    path: input.path,
    referrer: input.referrer?.slice(0, 2000) ?? null,
    user_id: input.userId,
    session_id: input.sessionId,
  });
}

export type DailyTrafficRow = {
  date: string;
  views: number;
  visitors: number;
};

export type TopPathRow = {
  path: string;
  views: number;
};

export type AdminSiteStats = {
  traffic: {
    viewsToday: number;
    views7d: number;
    views30d: number;
    visitors7d: number;
    visitors30d: number;
    loggedInViews30d: number;
    daily: DailyTrafficRow[];
    topPaths: TopPathRow[];
    hasData: boolean;
  };
  users: {
    totalCustomers: number;
    totalContractors: number;
    newCustomers7d: number;
    newContractors7d: number;
    newCustomers30d: number;
    newContractors30d: number;
  };
  activity: {
    projectsOpen: number;
    projectsCompleted: number;
    projectsCreated7d: number;
    projectsCreated30d: number;
    bidsSubmitted7d: number;
    bidsSubmitted30d: number;
  };
};

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function toDateKey(iso: string): string {
  return iso.slice(0, 10);
}

export async function fetchAdminSiteStats(): Promise<AdminSiteStats> {
  const admin = createAdminClient();
  const since30d = daysAgoIso(30);
  const since7d = daysAgoIso(7);
  const todayKey = toDateKey(new Date().toISOString());

  const [
    viewsResult,
    customerCount,
    contractorCount,
    newCustomers7d,
    newContractors7d,
    newCustomers30d,
    newContractors30d,
    projectsOpen,
    projectsCompleted,
    projectsCreated7d,
    projectsCreated30d,
    bids7d,
    bids30d,
  ] = await Promise.all([
    admin
      .from("page_views")
      .select("path, session_id, user_id, created_at")
      .gte("created_at", since30d)
      .order("created_at", { ascending: false })
      .limit(50000),
    admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "customer"),
    admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "contractor"),
    admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "customer")
      .gte("created_at", since7d),
    admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "contractor")
      .gte("created_at", since7d),
    admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "customer")
      .gte("created_at", since30d),
    admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "contractor")
      .gte("created_at", since30d),
    admin
      .from("projects")
      .select("id", { count: "exact", head: true })
      .in("status", ["published", "receiving_bids"]),
    admin
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("status", "completed"),
    admin
      .from("projects")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since7d),
    admin
      .from("projects")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since30d),
    admin
      .from("bids")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since7d),
    admin
      .from("bids")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since30d),
  ]);

  const views = viewsResult.data ?? [];
  const views7dList = views.filter((v) => v.created_at >= since7d);
  const sessions7d = new Set(views7dList.map((v) => v.session_id));
  const sessions30d = new Set(views.map((v) => v.session_id));

  const pathCounts = new Map<string, number>();
  for (const v of views) {
    pathCounts.set(v.path, (pathCounts.get(v.path) ?? 0) + 1);
  }
  const topPaths = [...pathCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([path, count]) => ({ path, views: count }));

  const dailyMap = new Map<string, { views: number; sessions: Set<string> }>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dailyMap.set(toDateKey(d.toISOString()), { views: 0, sessions: new Set() });
  }
  for (const v of views) {
    const key = toDateKey(v.created_at);
    const bucket = dailyMap.get(key);
    if (!bucket) continue;
    bucket.views += 1;
    bucket.sessions.add(v.session_id);
  }
  const daily: DailyTrafficRow[] = [...dailyMap.entries()].map(
    ([date, { views: count, sessions }]) => ({
      date,
      views: count,
      visitors: sessions.size,
    }),
  );

  return {
    traffic: {
      viewsToday: views.filter((v) => toDateKey(v.created_at) === todayKey).length,
      views7d: views7dList.length,
      views30d: views.length,
      visitors7d: sessions7d.size,
      visitors30d: sessions30d.size,
      loggedInViews30d: views.filter((v) => v.user_id).length,
      daily,
      topPaths,
      hasData: views.length > 0,
    },
    users: {
      totalCustomers: customerCount.count ?? 0,
      totalContractors: contractorCount.count ?? 0,
      newCustomers7d: newCustomers7d.count ?? 0,
      newContractors7d: newContractors7d.count ?? 0,
      newCustomers30d: newCustomers30d.count ?? 0,
      newContractors30d: newContractors30d.count ?? 0,
    },
    activity: {
      projectsOpen: projectsOpen.count ?? 0,
      projectsCompleted: projectsCompleted.count ?? 0,
      projectsCreated7d: projectsCreated7d.count ?? 0,
      projectsCreated30d: projectsCreated30d.count ?? 0,
      bidsSubmitted7d: bids7d.count ?? 0,
      bidsSubmitted30d: bids30d.count ?? 0,
    },
  };
}
