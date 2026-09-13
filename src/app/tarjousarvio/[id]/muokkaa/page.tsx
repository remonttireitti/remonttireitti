import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EvaluationItemForm } from "@/components/bid-evaluation/evaluation-item-form";
import { SiteHeader } from "@/components/site-header";
import { EvaluationSubmitButton } from "@/components/bid-evaluation/evaluation-submit-button";
import { brand } from "@/lib/brand-theme";
import { formatEurosFromCents } from "@/lib/bids";
import {
  fetchEvaluationItems,
  fetchEvaluationRequestById,
} from "@/lib/bid-evaluation-server";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function EditEvaluationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) redirect(`/kirjaudu?redirect=/tarjousarvio/${id}/muokkaa`);

  const supabase = await createClient();
  const request = await fetchEvaluationRequestById(supabase, id);
  if (!request || request.customer_id !== user.id) notFound();
  if (request.status !== "draft") redirect(`/tarjousarvio/${id}`);

  const items = await fetchEvaluationItems(supabase, id);

  let platformBids: {
    id: string;
    label: string;
    amount_cents: number;
    device_brand: string | null;
  }[] = [];

  if (request.project_id) {
    const { data: bids } = await supabase
      .from("bids")
      .select(
        "id, amount_cents, equipment_description, contractor_profiles ( company_name )",
      )
      .eq("project_id", request.project_id)
      .eq("status", "submitted");

    platformBids = (bids ?? []).map((b, i) => {
      const cp = b.contractor_profiles as
        | { company_name: string }
        | { company_name: string }[]
        | null;
      const company = Array.isArray(cp) ? cp[0]?.company_name : cp?.company_name;
      return {
        id: b.id as string,
        label: company ?? `Tarjous ${i + 1}`,
        amount_cents: b.amount_cents as number,
        device_brand: (b.equipment_description as string | null) ?? null,
      };
    });
  }

  const addedBidIds = new Set(items.filter((i) => i.bid_id).map((i) => i.bid_id));

  return (
    <div className={brand.page}>
      <SiteHeader />
      <main className={brand.mainContent}>
        <Link href="/tarjousarvio" className="text-sm font-medium text-sky-800 hover:underline">
          ← Tarjousvahti
        </Link>
        <h1 className="mt-4 text-2xl font-bold">Lisää arvioitavat tarjoukset</h1>
        <p className="mt-2 text-sm text-stone-600">
          Voit lisätä Remonttireitin tarjouksia tai ulkopuolisia tarjouksia (PDF/kuva).
        </p>

        {platformBids.length > 0 && (
          <section className="mt-8">
            <h2 className="text-lg font-semibold">Urakan tarjoukset</h2>
            <div className="mt-4 space-y-4">
              {platformBids
                .filter((b) => !addedBidIds.has(b.id))
                .map((b) => (
                  <EvaluationItemForm
                    key={b.id}
                    requestId={id}
                    bidId={b.id}
                    defaultLabel={b.label}
                    defaultAmountEuros={Math.round(b.amount_cents / 100)}
                    defaultDeviceBrand={b.device_brand ?? undefined}
                  />
                ))}
            </div>
          </section>
        )}

        <section className="mt-8">
          <h2 className="text-lg font-semibold">Ulkopuolinen tarjous</h2>
          <div className="mt-4">
            <EvaluationItemForm requestId={id} />
          </div>
        </section>

        {items.length > 0 && (
          <section className="mt-8">
            <h2 className="text-lg font-semibold">Lisätyt ({items.length})</h2>
            <ul className="mt-3 space-y-2 text-sm text-stone-700">
              {items.map((item) => (
                <li key={item.id} className="rounded-lg border border-stone-200 px-4 py-3">
                  {item.label}
                  {item.amount_cents != null && (
                    <> · {formatEurosFromCents(item.amount_cents)}</>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {items.length > 0 && (
          <div className="mt-8">
            <EvaluationSubmitButton requestId={id} />
          </div>
        )}
      </main>
    </div>
  );
}
