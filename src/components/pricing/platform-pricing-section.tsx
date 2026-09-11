import Link from "next/link";
import { platformFeeBetaPromoTitle } from "@/lib/platform-fee-beta";
import {
  PAY_PER_DEAL_FEE_CENTS,
  PLATFORM_PRICING_FAQ,
  PLATFORM_SUBSCRIPTION_PLANS,
  formatSubscriptionMonthly,
  formatSubscriptionPrice,
  payPerDealPriceLabel,
  platformPricingVatNote,
} from "@/lib/platform-pricing";
import { formatPlatformFee } from "@/lib/platform-fee";
import { brand } from "@/lib/brand-theme";

export function PlatformPricingSection({ className = "" }: { className?: string }) {
  const betaTitle = platformFeeBetaPromoTitle();

  return (
    <div className={`space-y-8 ${className}`}>
      {betaTitle && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-950">
          {betaTitle}
        </p>
      )}

      <p className="text-sm leading-relaxed text-stone-600">
        Valitse joko <strong>kuukausitilaus</strong> (ei per-diili -maksuja) tai{" "}
        <strong>maksu per diili</strong> (maksat vain voitetuista, mutta kalliimmin).
        Tarjouksen jättäminen on aina ilmaista.
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border-2 border-sky-200 bg-gradient-to-b from-sky-50/80 to-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-800">
            Suositus aktiiviselle
          </p>
          <h3 className="mt-1 text-xl font-bold text-stone-900">Kuukausitilaus</h3>
          <p className="mt-2 text-sm text-stone-600">
            Kiinteä kk-maksu — voitatko yhden tai kymmenen diiliä, per-diili -palkkiota
            ei tule.
          </p>

          <ul className="mt-5 space-y-3">
            {PLATFORM_SUBSCRIPTION_PLANS.map((plan) => (
              <li
                key={plan.slug}
                className={`rounded-xl border px-4 py-3 ${
                  plan.highlighted
                    ? "border-sky-300 bg-white ring-1 ring-sky-200"
                    : "border-stone-200 bg-white/80"
                }`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-semibold text-stone-900">{plan.name}</span>
                  <span className="text-lg font-bold text-sky-900">
                    {formatSubscriptionPrice(plan)}
                  </span>
                </div>
                {plan.months > 1 && (
                  <p className="mt-1 text-sm text-stone-600">
                    ≈ {formatSubscriptionMonthly(plan)} · {plan.savingsLabel}
                  </p>
                )}
              </li>
            ))}
          </ul>

          <Link
            href="/urakoitsijaksi/tilaa"
            className={`mt-5 inline-flex ${brand.btnPrimary}`}
          >
            Tilaa kuukausijakso
          </Link>
        </section>

        <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            Kallein · ei sitoutumista
          </p>
          <h3 className="mt-1 text-xl font-bold text-stone-900">Maksu per diili</h3>
          <p className="mt-2 text-sm text-stone-600">
            Et maksa kuukausimaksua. Maksat vain, kun asiakas hyväksyy tarjouksesi.
            Sopii, jos tarjoat harvoin.
          </p>

          <p className="mt-6">
            <span className="text-4xl font-bold tracking-tight text-stone-900">
              {formatPlatformFee(PAY_PER_DEAL_FEE_CENTS)}
            </span>
            <span className="ml-2 text-sm text-stone-500">/ hyväksytty diili veroton</span>
          </p>

          <ul className="mt-5 space-y-2 text-sm text-stone-700">
            <li className="flex gap-2">
              <span className="text-sky-600" aria-hidden>
                ✓
              </span>
              Ei kuukausimaksua
            </li>
            <li className="flex gap-2">
              <span className="text-sky-600" aria-hidden>
                ✓
              </span>
              {payPerDealPriceLabel()} (+ ALV laskulla)
            </li>
            <li className="flex gap-2">
              <span className="text-stone-400" aria-hidden>
                ○
              </span>
              Useampi diili kuukaudessa → tilaus yleensä halvempi
            </li>
          </ul>

          <p className="mt-5 text-sm text-stone-500">
            Oletus uusille urakoitsijoille. Voit siirtyä kuukausitilaukseen milloin
            tahansa.
          </p>
        </section>
      </div>

      <p className="text-xs text-stone-500">{platformPricingVatNote()}</p>

      <section className="rounded-xl border border-stone-200 bg-stone-50/60 p-5">
        <h4 className="font-semibold text-stone-900">Usein kysyttyä</h4>
        <dl className="mt-3 space-y-4">
          {PLATFORM_PRICING_FAQ.map((item) => (
            <div key={item.q}>
              <dt className="text-sm font-medium text-stone-900">{item.q}</dt>
              <dd className="mt-1 text-sm leading-relaxed text-stone-600">{item.a}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
