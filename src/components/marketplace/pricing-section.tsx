import Link from "next/link";
import { brand } from "@/lib/brand-theme";
import {
  CONSUMER_FREE_PLAN,
  CONTRACTOR_PLANS,
  LISTING_SINGLE,
  MARKETPLACE_INVOICE_EMAIL,
  type PricingPlan,
} from "@/lib/marketplace-pricing";

function PlanCard({
  plan,
  actionHref,
}: {
  plan: PricingPlan;
  actionHref?: string;
}) {
  return (
    <article
      className={`flex flex-col rounded-2xl border p-6 shadow-sm ${
        plan.highlighted
          ? "border-orange-300 bg-gradient-to-b from-orange-50/80 to-white ring-2 ring-orange-400/50"
          : "border-stone-200 bg-white"
      }`}
    >
      <h3 className="text-lg font-semibold text-stone-900">{plan.name}</h3>
      <p className="mt-2">
        <span className="text-3xl font-bold tracking-tight text-sky-950">
          {plan.priceLabel}
        </span>
        {plan.period && (
          <span className="text-sm text-stone-500">{plan.period}</span>
        )}
      </p>
      {plan.listingQuota != null && plan.audience === "contractor" && (
        <p className="mt-1 text-sm text-stone-600">
          {plan.listingQuota} aktiivista ilmoitusta
        </p>
      )}
      <ul className="mt-4 flex-1 space-y-2 text-sm text-stone-700">
        {plan.features.map((f) => (
          <li key={f} className="flex gap-2">
            <span className="text-sky-600" aria-hidden>
              ✓
            </span>
            {f}
          </li>
        ))}
      </ul>
      {actionHref ? (
        <Link href={actionHref} className={`mt-6 block text-center ${brand.btnPrimary}`}>
          {plan.cta}
        </Link>
      ) : (
        <p className="mt-6 text-center text-sm text-stone-500">{plan.cta}</p>
      )}
    </article>
  );
}

export function MarketplacePricingSection({
  showConsumer,
  contractorActionBase = "/markkinapaikka/tilaa",
}: {
  showConsumer?: boolean;
  contractorActionBase?: string;
}) {
  return (
    <div>
      {showConsumer !== false && (
        <section className="rounded-2xl border border-sky-200 bg-sky-50/50 p-6 sm:p-8">
          <p className="text-sm font-medium uppercase tracking-wide text-sky-800">
            Yksityisille
          </p>
          <h2 className="mt-1 text-xl font-bold text-sky-950">
            {CONSUMER_FREE_PLAN.name}
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-sky-900/90">
            Myy remonttiin liittyvä laite, varaosa tai tarvike ilman maksua.
            Ammattilaiset ja ostajat löytävät ilmoituksen torilta.
          </p>
          <ul className="mt-4 grid gap-2 text-sm text-sky-950 sm:grid-cols-2">
            {CONSUMER_FREE_PLAN.features.map((f) => (
              <li key={f} className="flex gap-2">
                <span aria-hidden>✓</span>
                {f}
              </li>
            ))}
          </ul>
          <Link
            href="/markkinapaikka/ilmoita?tyyppi=kuluttaja"
            className={`mt-6 inline-block ${brand.btnPrimary}`}
          >
            {CONSUMER_FREE_PLAN.cta}
          </Link>
        </section>
      )}

      <section className="mt-12">
        <p className="text-sm font-medium uppercase tracking-wide text-stone-500">
          Urakoitsijoille ja yrityksille
        </p>
        <h2 className="mt-1 text-xl font-bold text-stone-900">
          Kuukausipaketit ja yksittäinen ilmoitus
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-stone-600">
          Laskutus lähetetään sähköpostiin ({MARKETPLACE_INVOICE_EMAIL}). Ilmoitukset
          julkaistaan maksun kirjauksen jälkeen — yleensä 1–2 arkipäivää.
        </p>
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          {CONTRACTOR_PLANS.map((plan) => (
            <PlanCard
              key={plan.slug}
              plan={plan}
              actionHref={`${contractorActionBase}?paketti=${plan.slug}`}
            />
          ))}
        </div>
        <div className="mt-8">
          <PlanCard
            plan={LISTING_SINGLE}
            actionHref={`${contractorActionBase}?paketti=${LISTING_SINGLE.slug}`}
          />
        </div>
      </section>
    </div>
  );
}
