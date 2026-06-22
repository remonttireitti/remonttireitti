import { NextResponse } from "next/server";
import { fetchPrimaryHub } from "@/lib/hubs";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { mqtt_topic?: string; value?: unknown; node_id?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { mqtt_topic, value } = body;
  if (!mqtt_topic || typeof mqtt_topic !== "string") {
    return NextResponse.json({ ok: false, error: "mqtt_topic required" }, { status: 400 });
  }
  if (value === undefined) {
    return NextResponse.json({ ok: false, error: "value required" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Kirjaudu sisään." }, { status: 401 });
  }

  const hub = await fetchPrimaryHub(supabase, user.id);
  if (!hub) {
    return NextResponse.json({ ok: false, error: "Hubia ei löydy." }, { status: 503 });
  }

  const { error } = await supabase.from("commands").insert({
    hub_id: hub.id,
    user_id: user.id,
    command: "set_zwave_property",
    payload: { mqtt_topic, value },
  });

  if (error) {
    return NextResponse.json({ ok: false, error: "Komennon lähetys epäonnistui." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, queued: true });
}
