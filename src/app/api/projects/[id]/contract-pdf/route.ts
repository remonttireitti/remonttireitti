import { NextResponse } from "next/server";
import {
  canAccessContractSummary,
  contractPdfFilename,
} from "@/lib/accepted-bid-contract";
import { loadAcceptedBidDocument } from "@/lib/accepted-bid-document";
import { renderAcceptedBidPdf } from "@/lib/accepted-bid-pdf";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

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

  try {
    const pdf = await renderAcceptedBidPdf(document);
    const filename = contractPdfFilename(project.title, projectId);

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("[contract-pdf]", error);
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 });
  }
}
