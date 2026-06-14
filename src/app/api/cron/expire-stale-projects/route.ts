import { expireAllStaleProjects } from "@/lib/expire-stale-projects";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");

  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { warned, closed } = await expireAllStaleProjects();

  return NextResponse.json({ ok: true, warned, closed });
}
