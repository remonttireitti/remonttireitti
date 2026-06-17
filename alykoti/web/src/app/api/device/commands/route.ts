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

export async function GET() {
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

  const { data, error } = await supabase
    .from("commands")
    .select("id, command, payload, status, created_at, delivered_at, acked_at, error_message")
    .eq("hub_id", hub.id)
    .order("created_at", { ascending: false })
    .limit(8);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ commands: (data ?? []) as CommandRow[] });
}
