import { NextResponse } from "next/server";
import { recordContractorQuotePdfExport } from "@/lib/contractor-quote-pdf-export-server";
import { loadContractorQuotePdfData } from "@/lib/contractor-quote-server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(
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
  if (alreadyExported) {
    return NextResponse.json({ ok: true, alreadyExported: true });
  }

  // PDF-vienti ei kuluta tallennuskiintiötä — vain tilasto-/tila-kirjaus.
  await recordContractorQuotePdfExport(supabase, quoteId, user.id);
  return NextResponse.json({ ok: true });
}
