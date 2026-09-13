import Link from "next/link";
import { redirect } from "next/navigation";
import { EvaluationClaimButton } from "@/components/bid-evaluation/evaluation-claim-button";
import { EvaluatorAvailabilityForm } from "@/components/bid-evaluation/evaluator-availability-form";
import { SiteHeader } from "@/components/site-header";
import { brand } from "@/lib/brand-theme";
import {
  BID_EVALUATION_STATUS_LABELS,
  formatEvaluationCategoryLabel,
  formatHeatPumpType,
} from "@/lib/bid-evaluation";
import {
  fetchEvaluatorProfile,
  fetchEvaluatorQueue,
} from "@/lib/bid-evaluation-server";
import { fetchEvaluatorScopes, requireEvaluator } from "@/lib/evaluator";
import {
  evaluatorScopeLabel,
  expandEvaluatorScopesForQueue,
} from "@/lib/evaluator-scopes";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function EvaluatorQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ valmis?: string; palautettu?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/kirjaudu?redirect=/arvioija");
  await requireEvaluator();

  const { valmis, palautettu } = await searchParams;
  const scopes = await fetchEvaluatorScopes(user.id);
  const queueCategories = expandEvaluatorScopesForQueue(scopes);
  const supabase = await createClient();
  const queue = await fetchEvaluatorQueue(supabase, queueCategories);
  const profile = await fetchEvaluatorProfile(supabase, user.id);

  return (
    <div className={brand.page}>
      <SiteHeader />
      <main className={brand.mainContent}>
        <h1 className="text-2xl font-bold">Tarjousvahti — arvioijalle</h1>
        <p className="mt-2 text-sm text-stone-600">
          Alueet:{" "}
          {scopes.length > 0
            ? scopes.map((s) => evaluatorScopeLabel(s)).join(", ")
            : "ei määritelty"}
        </p>

        {valmis === "1" && (
          <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900" role="status">
            Arvio julkaistu asiakkaalle.
          </p>
        )}

        {palautettu === "1" && (
          <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-950" role="status">
            Pyyntö palautettiin jonoon toiselle arvioijalle.
          </p>
        )}

        <div className="mt-6">
          <EvaluatorAvailabilityForm profile={profile} />
        </div>

        {!profile.accepting_reviews && (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            Et ota tällä hetkellä uusia pyyntöjä vastaan. Voit silti jatkaa käynnissä olevia
            arviointeja.
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
                    {formatEvaluationCategoryLabel(r.category)}
                    {r.heat_pump_type && ` · ${formatHeatPumpType(r.heat_pump_type)}`}
                  </p>
                  <p className="text-sm text-stone-600">
                    {BID_EVALUATION_STATUS_LABELS[r.status]}
                    {r.submitted_at &&
                      ` · ${new Date(r.submitted_at).toLocaleDateString("fi-FI")}`}
                  </p>
                </div>
                {r.status === "submitted" ? (
                  profile.accepting_reviews ? (
                    <EvaluationClaimButton requestId={r.id} />
                  ) : (
                    <span className="text-xs text-stone-500">Et ota uusia pyyntöjä</span>
                  )
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
