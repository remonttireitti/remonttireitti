import { getYellowApiUrl } from "@/lib/local-mode";
import { normalizeHub } from "@/lib/hubs";
import type { Hub } from "@/lib/types";

type YellowFetchOptions = {
  method?: string;
  body?: unknown;
  cache?: RequestCache;
};

export async function fetchYellowApi<T = unknown>(
  path: string,
  options: YellowFetchOptions = {},
): Promise<{ status: number; data: T }> {
  const base = getYellowApiUrl();
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const init: RequestInit = {
    method: options.method ?? "GET",
    cache: options.cache ?? "no-store",
    headers: { Accept: "application/json" },
  };
  if (options.body !== undefined) {
    init.headers = { ...init.headers, "Content-Type": "application/json" };
    init.body = JSON.stringify(options.body);
  }
  const res = await fetch(url, init);
  const text = await res.text();
  let data: T;
  try {
    data = text ? (JSON.parse(text) as T) : ({} as T);
  } catch {
    throw new Error(`Yellow API invalid JSON (${res.status}): ${text.slice(0, 200)}`);
  }
  return { status: res.status, data };
}

export async function fetchYellowHub(): Promise<Hub | null> {
  const { status, data } = await fetchYellowApi<Record<string, unknown>>("/api/hub");
  if (status !== 200 || !data || typeof data !== "object") return null;
  return normalizeHub(data);
}
