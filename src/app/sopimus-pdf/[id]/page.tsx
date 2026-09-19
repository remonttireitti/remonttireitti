import { redirect } from "next/navigation";
import { AcceptedBidPdfAutoDownload } from "@/components/bid/accepted-bid-pdf-download";
import { SiteHeader } from "@/components/site-header";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ContractPdfDownloadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) redirect(`/kirjaudu?redirect=/sopimus-pdf/${id}`);

  return (
    <div className="min-h-full bg-stone-100">
      <SiteHeader />
      <main>
        <AcceptedBidPdfAutoDownload
          projectId={id}
          backHref={`/remontti/${id}/sopimus`}
        />
      </main>
    </div>
  );
}
