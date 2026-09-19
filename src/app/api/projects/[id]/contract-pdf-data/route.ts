import { NextResponse } from "next/server";
import {
  canAccessContractSummary,
  contractPdfFilename,
} from "@/lib/accepted-bid-contract";
import { loadAcceptedBidDocument } from "@/lib/accepted-bid-document";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** JSON for browser-side PDF generation — server-side react-pdf exceeds Worker limits. */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id, customer_id, status, accepted_bid_id, title")
    .eq("id", projectId)
    .maybeSingle();

  if (!project?.accepted_bid_id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const allowed = await canAccessContractSummary(supabase, user.id, project);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const document = await loadAcceptedBidDocument(
    supabase,
    projectId,
    project.accepted_bid_id,
  );

  if (!document) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    document,
    filename: contractPdfFilename(project.title, projectId),
  });
}
