import { NextResponse } from "next/server";
import { syncDevice } from "@/lib/device-sync";
import type { DeviceSyncRequest } from "@/lib/types";

export const runtime = "nodejs";

function extractDeviceToken(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7).trim() || null;
  return request.headers.get("x-device-token")?.trim() || null;
}

export async function POST(request: Request) {
  const deviceToken = extractDeviceToken(request);
  if (!deviceToken) {
    return NextResponse.json({ error: "device_token_required" }, { status: 401 });
  }

  let body: DeviceSyncRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  try {
    const result = await syncDevice(deviceToken, body);
    if (!result) {
      return NextResponse.json({ error: "unknown_device" }, { status: 401 });
    }
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "sync_failed" }, { status: 500 });
  }
}
