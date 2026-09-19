import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { buildAdminSampleQuoteDocument } from "@/lib/contractor-quote-print";
import { renderContractorQuotePdf } from "@/lib/contractor-quote-pdf";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sample = buildAdminSampleQuoteDocument();

  try {
    const pdf = await renderContractorQuotePdf(sample);
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition":
          'attachment; filename="tarjous-esimerkki-remonttireitti.pdf"',
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("[admin-contractor-quote-sample-pdf]", error);
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 });
  }
}
