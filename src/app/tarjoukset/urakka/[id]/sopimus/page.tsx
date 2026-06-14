import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AcceptedBidDocument, loadAcceptedBidDocument } from "@/lib/accepted-bid-document";
import { PrintDocumentToolbar } from "@/components/bid/print-document-toolbar";
import { SiteHeader } from "@/components/site-header";
import { getSessionUser, isContractor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_STATUSES = ["bid_accepted", "in_progress", "completed"];

export default async function ContractorContractSummaryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) redirect(`/kirjaudu?redirect=/tarjoukset/urakka/${id}/sopimus`);

  if (!(await isContractor())) {
    redirect("/oma-tili?viesti=vain-urakoitsijalle");
  }

  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id, status, accepted_bid_id")
    .eq("id", id)
    .single();

  if (!project?.accepted_bid_id || !ALLOWED_STATUSES.includes(project.status)) {
    notFound();
  }

  const { data: bid } = await supabase
    .from("bids")
    .select("id")
    .eq("project_id", id)
    .eq("contractor_id", user.id)
    .eq("id", project.accepted_bid_id)
    .maybeSingle();

  if (!bid) notFound();

  const document = await loadAcceptedBidDocument(
    supabase,
    id,
    project.accepted_bid_id,
  );

  if (!document) notFound();

  return (
    <div className="min-h-full bg-stone-100 text-stone-900 print:bg-white print:text-black">
      <div className="print:hidden">
        <SiteHeader />
      </div>
      <main className="mx-auto max-w-4xl px-4 py-8 print:max-w-none print:p-0">
        <PrintDocumentToolbar
          backHref={`/tarjoukset/urakka/${id}`}
          backLabel="Takaisin urakkaan"
        />
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm print:border-0 print:p-8 print:shadow-none sm:p-10">
          <AcceptedBidDocument data={document} />
        </div>
      </main>
    </div>
  );
}
