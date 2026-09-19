import { NextResponse } from "next/server";
import {
  canExportContractorQuotePdf,
  fetchContractorQuotePdfUsage,
} from "@/lib/contractor-quote-limits";
import { renderContractorQuotePdf } from "@/lib/contractor-quote-pdf";
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

  try {
    const pdf = await renderContractorQuotePdf(pdfData);
    const filename = quotePdfFilename(pdfData.quote.title, quoteId);

    if (!alreadyExported) {
      await supabase.from("contractor_quote_pdf_exports").insert({
        contractor_id: user.id,
        quote_id: quoteId,
      });

      await supabase
        .from("contractor_quotes")
        .update({
          pdf_generated_at: new Date().toISOString(),
          status: "finalized",
        })
        .eq("id", quoteId)
        .eq("contractor_id", user.id);
    }

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("[contractor-quote-pdf]", error);
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 });
  }
}
