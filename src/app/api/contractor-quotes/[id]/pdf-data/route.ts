import { NextResponse } from "next/server";
import {
  canExportContractorQuotePdf,
  fetchContractorQuotePdfUsage,
} from "@/lib/contractor-quote-limits";
import { quotePdfFilename } from "@/lib/contractor-quote-types";
import { loadContractorQuotePdfData } from "@/lib/contractor-quote-server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: quoteId } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pdfData = await loadContractorQuotePdfData(
    supabase,
    quoteId,
    user.id,
  );

  if (!pdfData) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const alreadyExported = Boolean(pdfData.quote.pdf_generated_at);
  const usage = await fetchContractorQuotePdfUsage(supabase, user.id);

  if (!canExportContractorQuotePdf(usage, alreadyExported)) {
    return NextResponse.json(
      {
        error: "Kuukausiraja täynnä",
        limit: usage.limit,
        used: usage.used,
      },
      { status: 429 },
    );
  }

  return NextResponse.json({
    pdfData,
    filename: quotePdfFilename(pdfData.quote.title, quoteId),
    recordExport: !alreadyExported,
  });
}
