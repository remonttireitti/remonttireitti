import { NextResponse } from "next/server";
import { isLocalMode } from "@/lib/local-mode";
import { fetchYellowApi } from "@/lib/yellow-api";

/** Delegoi API-reitti Yellow-backendille LOCAL_MODE:ssa. */
export async function delegateToYellowApi(
  request: Request,
  yellowPath: string,
): Promise<NextResponse | null> {
  if (!isLocalMode()) return null;

  let body: unknown;
  if (request.method !== "GET" && request.method !== "HEAD") {
    try {
      body = await request.json();
    } catch {
      body = undefined;
    }
  }

  const { status, data } = await fetchYellowApi(yellowPath, {
    method: request.method,
    body,
  });
  return NextResponse.json(data, { status });
}
