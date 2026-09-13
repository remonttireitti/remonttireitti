import Link from "next/link";
import { redirect } from "next/navigation";
import { EvaluationClaimButton } from "@/components/bid-evaluation/evaluation-claim-button";
import { SiteHeader } from "@/components/site-header";
import { brand } from "@/lib/brand-theme";
import {
  BID_EVALUATION_CATEGORY_LABELS,
  BID_EVALUATION_STATUS_LABELS,
  formatHeatPumpType,
} from "@/lib/bid-evaluation";
import { fetchEvaluatorQueue } from "@/lib/bid-evaluation-server";
import { fetchEvaluatorScopes, requireEvaluator } from "@/lib/evaluator";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function EvaluatorQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ valmis?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/kirjaudu?redirect=/arvioija");
  await requireEvaluator();

  const { valmis } = await searchParams;
  const scopes = await fetchEvaluatorScopes(user.id);
  const supabase = await createClient();
  const queue = await fetchEvaluatorQueue(supabase, scopes);

  return (
    <div className={brand.page}>
      <SiteHeader />
      <main className={brand.mainContent}>
        <h1 className="text-2xl font-bold">Tarjousvahti — arvioijalle</h1>
        <p className="mt-2 text-sm text-stone-600">
          Alueet: {scopes.join(", ") || "ei määritelty"}
        </p>

        {valmis === "1" && (
          <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900" role="status">
            Arvio julkaistu asiakkaalle.
          </p>
        )}

        {queue.length === 0 ? (
          <p className="mt-8 text-sm text-stone-600">Ei jonossa olevia pyyntöjä.</p>
        ) : (
          <ul className="mt-8 divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-white">
            {queue.map((r) => (
              <li
                key={r.id}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-stone-900">
                    {BID_EVALUATION_CATEGORY_LABELS[r.category]}
                    {r.heat_pump_type && ` · ${formatHeatPumpType(r.heat_pump_type)}`}
                  </p>
                  <p className="text-sm text-stone-600">
                    {BID_EVALUATION_STATUS_LABELS[r.status]}
                    {r.submitted_at &&
                      ` · ${new Date(r.submitted_at).toLocaleDateString("fi-FI")}`}
                  </p>
                </div>
                {r.status === "submitted" ? (
                  <EvaluationClaimButton requestId={r.id} />
                ) : (
                  <Link
                    href={`/arvioija/${r.id}`}
                    className="text-sm font-semibold text-sky-800 hover:underline"
                  >
                    Jatka arviota →
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
