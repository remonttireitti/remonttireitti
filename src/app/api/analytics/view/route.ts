import { NextResponse } from "next/server";
import { insertPageView } from "@/lib/admin-stats-server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  let body: { path?: string; referrer?: string | null; sessionId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const path = String(body.path ?? "").trim();
  const sessionId = String(body.sessionId ?? "").trim();
  if (!path || !sessionId) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  try {
    await insertPageView({
      path,
      referrer: body.referrer ? String(body.referrer) : null,
      userId: user?.id ?? null,
      sessionId,
    });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
