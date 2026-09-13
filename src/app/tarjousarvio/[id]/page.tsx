import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EvaluationResultDisplay } from "@/components/bid-evaluation/evaluation-result-display";
import { SiteHeader } from "@/components/site-header";
import { brand } from "@/lib/brand-theme";
import {
  BID_EVALUATION_CATEGORY_LABELS,
  BID_EVALUATION_STATUS_LABELS,
  formatHeatPumpType,
} from "@/lib/bid-evaluation";
import { fetchBidEvaluationFilesForItems } from "@/lib/bid-evaluation-files";
import {
  fetchEvaluationItems,
  fetchEvaluationRequestById,
  fetchEvaluationReview,
  fetchEvaluationScores,
} from "@/lib/bid-evaluation-server";
import { getSessionUser } from "@/lib/auth";
import { isEvaluator } from "@/lib/evaluator";
import { createClient } from "@/lib/supabase/server";

export default async function EvaluationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lahetetty?: string }>;
}) {
  const { id } = await params;
  const { lahetetty } = await searchParams;
  const user = await getSessionUser();
  if (!user) redirect(`/kirjaudu?redirect=/tarjousarvio/${id}`);

  const supabase = await createClient();
  const request = await fetchEvaluationRequestById(supabase, id);
  if (!request) notFound();

  const isOwner = request.customer_id === user.id;
  const evaluator = await isEvaluator();
  if (!isOwner && !evaluator) notFound();

  if (request.status === "draft" && isOwner) {
    redirect(`/tarjousarvio/${id}/muokkaa`);
  }

  const items = await fetchEvaluationItems(supabase, id);
  const review = await fetchEvaluationReview(supabase, id);
  const scores = review ? await fetchEvaluationScores(supabase, review.id) : [];
  const filesByItem = await fetchBidEvaluationFilesForItems(
    supabase,
    items.map((i) => i.id),
  );

  const filesMap = new Map(
    [...filesByItem.entries()].map(([itemId, files]) => [
      itemId,
      files.map((f) => ({ original_name: f.original_name, url: f.url })),
    ]),
  );

  return (
    <div className={brand.page}>
      <SiteHeader />
      <main className={brand.mainContent}>
        <Link href="/tarjousarvio/omat" className="text-sm font-medium text-sky-800 hover:underline">
          ← Omat arviopyynnöt
        </Link>

        {lahetetty === "1" && (
          <p className="mt-4 rounded-lg bg-sky-50 p-3 text-sm text-sky-900" role="status">
            Pyyntö lähetetty. Saat ilmoituksen, kun arvio on valmis.
          </p>
        )}

        <h1 className="mt-4 text-2xl font-bold">Tarjousarvio</h1>
        <p className="mt-2 text-sm text-stone-600">
          {BID_EVALUATION_CATEGORY_LABELS[request.category]}
          {request.heat_pump_type &&
            ` · ${formatHeatPumpType(request.heat_pump_type)}`}{" "}
          · {BID_EVALUATION_STATUS_LABELS[request.status]}
        </p>

        {request.context_notes && (
          <p className="mt-4 text-sm text-stone-700">{request.context_notes}</p>
        )}

        {request.status === "completed" && review ? (
          <div className="mt-8">
            <EvaluationResultDisplay
              items={items}
              review={review}
              scores={scores}
              filesByItem={filesMap}
            />
          </div>
        ) : (
          <p className="mt-8 rounded-xl border border-stone-200 bg-stone-50 px-5 py-8 text-sm text-stone-600">
            {request.status === "submitted" && "Pyyntö jonossa arvioijalle."}
            {request.status === "in_review" && "Arvioija käsittelee pyyntöäsi."}
            {request.status === "cancelled" && "Pyyntö on peruttu."}
          </p>
        )}
      </main>
    </div>
  );
}
