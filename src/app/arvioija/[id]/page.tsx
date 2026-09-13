import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EvaluationReviewForm } from "@/components/bid-evaluation/evaluation-review-form";
import { SiteHeader } from "@/components/site-header";
import { brand } from "@/lib/brand-theme";
import { formatHeatPumpType } from "@/lib/bid-evaluation";
import { fetchBidEvaluationFilesForItems } from "@/lib/bid-evaluation-files";
import {
  fetchEvaluationItems,
  fetchEvaluationRequestById,
} from "@/lib/bid-evaluation-server";
import { requireEvaluator } from "@/lib/evaluator";
import { formatEurosFromCents } from "@/lib/bids";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function EvaluatorReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) redirect(`/kirjaudu?redirect=/arvioija/${id}`);
  await requireEvaluator();

  const supabase = await createClient();
  const request = await fetchEvaluationRequestById(supabase, id);
  if (!request || request.status !== "in_review") notFound();
  if (request.assigned_evaluator_id && request.assigned_evaluator_id !== user.id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.role !== "admin") notFound();
  }

  const items = await fetchEvaluationItems(supabase, id);
  const filesByItem = await fetchBidEvaluationFilesForItems(
    supabase,
    items.map((i) => i.id),
  );

  return (
    <div className={brand.page}>
      <SiteHeader />
      <main className={brand.mainWide}>
        <Link href="/arvioija" className="text-sm font-medium text-sky-800 hover:underline">
          ← Jonosta
        </Link>
        <h1 className="mt-4 text-2xl font-bold">Arvioi tarjoukset</h1>
        {request.heat_pump_type && (
          <p className="mt-1 text-sm text-stone-600">
            {formatHeatPumpType(request.heat_pump_type)}
          </p>
        )}
        {request.context_notes && (
          <p className="mt-4 rounded-lg bg-stone-50 p-4 text-sm text-stone-700">
            {request.context_notes}
          </p>
        )}

        <section className="mt-6 space-y-4">
          {items.map((item) => {
            const files = filesByItem.get(item.id) ?? [];
            return (
              <div
                key={item.id}
                className="rounded-xl border border-stone-200 bg-white p-4 text-sm"
              >
                <p className="font-semibold">{item.label}</p>
                {item.amount_cents != null && (
                  <p>{formatEurosFromCents(item.amount_cents)}</p>
                )}
                {item.notes && <p className="mt-1 text-stone-600">{item.notes}</p>}
                {files.map((f) => (
                  <a
                    key={f.id}
                    href={f.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 block text-sky-800 hover:underline"
                  >
                    {f.original_name ?? "Liite"}
                  </a>
                ))}
              </div>
            );
          })}
        </section>

        <div className="mt-8">
          <EvaluationReviewForm requestId={id} items={items} />
        </div>
      </main>
    </div>
  );
}
