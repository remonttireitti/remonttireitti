import { PRICING_FAQ } from "@/lib/marketplace-pricing";

export function MarketplacePricingFaq() {
  return (
    <section className="mt-16">
      <h2 className="text-xl font-bold text-stone-900">Usein kysyttyä</h2>
      <dl className="mt-6 space-y-6">
        {PRICING_FAQ.map((item) => (
          <div key={item.q} className="border-b border-stone-100 pb-6 last:border-0">
            <dt className="font-medium text-stone-900">{item.q}</dt>
            <dd className="mt-2 text-sm leading-relaxed text-stone-600">{item.a}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
