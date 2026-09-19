import { redirect } from "next/navigation";
import { ContractorQuotePdfAutoDownload } from "@/components/contractor/contractor-quote-pdf-download";
import { SiteHeader } from "@/components/site-header";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ContractorQuotePdfDownloadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/kirjaudu?redirect=/tarjouslaskuri");

  const { id } = await params;

  return (
    <div className="min-h-full bg-stone-100">
      <SiteHeader />
      <main>
        <ContractorQuotePdfAutoDownload quoteId={id} backHref="/tarjouslaskuri" />
      </main>
    </div>
  );
}
