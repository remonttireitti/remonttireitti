import type { Metadata } from "next";
import { PrintDocumentToolbar } from "@/components/bid/print-document-toolbar";
import { HuoltopoytakirjaDocument } from "@/components/reports/huoltopoytakirja-document";
import { SiteHeader } from "@/components/site-header";
import { EXAMPLE_CONVECTOR_REPORT } from "@/lib/example-convector-report";
import { pageMetadata } from "@/lib/seo";
import { seoDefByPath } from "@/lib/seo-pages";

const seo = seoDefByPath("/esimerkki/raportti")!;

export const metadata: Metadata = pageMetadata({
  title: seo.title,
  description: seo.description,
  path: "/esimerkki/raportti",
  keywords: seo.keywords,
});

export default function ExampleConvectorReportPage() {
  return (
    <div className="min-h-full bg-stone-100 text-stone-900 print:bg-white print:text-black">
      <div className="print:hidden">
        <SiteHeader />
      </div>
      <main className="mx-auto max-w-6xl px-4 py-8 print:max-w-none print:p-0">
        <div className="print:hidden">
          <p className="mb-3 text-sm text-stone-600">
            Fiktiivinen huoltopöytäkirja konvektoreille — päivämäärä 01.01.2026,
            tekijä Esimerkki tekijä, asiakas Esimerkki asiakas. Voit tulostaa tai
            tallentaa PDF:ksi.
          </p>
          <PrintDocumentToolbar backHref="/" backLabel="Etusivu" />
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm print:border-0 print:p-0 print:shadow-none sm:p-8">
          <HuoltopoytakirjaDocument report={EXAMPLE_CONVECTOR_REPORT} />
        </div>
      </main>
    </div>
  );
}
