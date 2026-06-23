import { fetchPrimaryHub } from "@/lib/hubs";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export type CommandRow = {
  id: string;
  command: string;
  payload: Record<string, unknown>;
  status: string;
  created_at: string;
  delivered_at: string | null;
  acked_at: string | null;
  error_message: string | null;
};

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hub = await fetchPrimaryHub(supabase, user.id);
  if (!hub) {
    return NextResponse.json({ commands: [] });
  }

  const url = new URL(request.url);
  const track = url.searchParams
    .get("track")
    ?.split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0);

  if (track && track.length > 0) {
    const { data, error } = await supabase
      .from("commands")
      .select("id, command, payload, status, created_at, delivered_at, acked_at, error_message")
      .eq("hub_id", hub.id)
      .in("id", track.slice(0, 8));

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ commands: (data ?? []) as CommandRow[] });
  }

  const { data, error } = await supabase
    .from("commands")
    .select("id, command, payload, status, created_at, delivered_at, acked_at, error_message")
    .eq("hub_id", hub.id)
    .in("status", ["pending", "delivered"])
    .order("created_at", { ascending: false })
    .limit(4);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ commands: (data ?? []) as CommandRow[] });
}
