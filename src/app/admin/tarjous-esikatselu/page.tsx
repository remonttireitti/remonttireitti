import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/admin-nav";
import { ContractorQuoteDocument } from "@/components/contractor/contractor-quote-document";
import { ContractorQuotePrintToolbar } from "@/components/contractor/contractor-quote-print-toolbar";
import { SiteHeader } from "@/components/site-header";
import { requireAdmin } from "@/lib/admin";
import { buildAdminSampleQuoteDocument } from "@/lib/contractor-quote-print";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminQuotePrintPreviewPage() {
  const user = await getSessionUser();
  if (!user) redirect("/kirjaudu?redirect=/admin/tarjous-esikatselu");

  await requireAdmin();

  const sample = buildAdminSampleQuoteDocument();

  return (
    <div className="min-h-full bg-stone-100 text-stone-900 print:bg-white print:text-black">
      <div className="print:hidden">
        <SiteHeader />
      </div>
      <main className="mx-auto max-w-4xl px-4 py-8 print:max-w-none print:p-0">
        <div className="print:hidden">
          <h1 className="text-2xl font-bold text-stone-900">
            Tarjouksen tulostus — esikatselu
          </h1>
          <p className="mt-1 text-sm text-stone-600">
            Esimerkki siitä, miltä urakoitsijan PDF-tarjous ja selain-tuloste
            näyttävät. Alatunnisteessa on Remonttireitti-logo.
          </p>
          <AdminNav current="/admin/tarjous-esikatselu" />
        </div>

        <div className="print:hidden mt-6">
          <ContractorQuotePrintToolbar
            backHref="/admin"
            backLabel="Hallinta"
            pdfData={sample}
            filename="tarjous-esimerkki-remonttireitti.pdf"
          />
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm print:border-0 print:p-8 print:shadow-none sm:p-10">
          <ContractorQuoteDocument data={sample} />
        </div>
      </main>
    </div>
  );
}
