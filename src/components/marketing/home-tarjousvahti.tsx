import { RoleAwareLink } from "@/components/navigation/role-aware-link";
import { brand } from "@/lib/brand-theme";
import {
  IMPARTIALITY_NOTICE,
  type BidEvaluationSettings,
} from "@/lib/bid-evaluation";

export function HomeTarjousvahti({
  settings = { pricing_mode: "free", price_per_bid_cents: null },
}: {
  settings?: BidEvaluationSettings;
}) {
  const priceLine =
    settings.pricing_mode === "free"
      ? "Maksuton."
      : `${Math.round((settings.price_per_bid_cents ?? 0) / 100)} € / tarjous.`;
  return (
    <section className="border-t border-violet-100 bg-gradient-to-br from-violet-50/40 via-white to-sky-50/30 py-12">
      <div className={brand.containerWide}>
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-medium uppercase tracking-wide text-violet-800">
            Tarjousvahti — uutta
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-stone-900">
            Saitko tarjoukset muualta?
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-stone-600">
            Lähetä tarjoukset arvioitavaksi — alan ammattilainen auttaa ymmärtämään
            hintaa ja sisältöä. {priceLine} Aloitamme lämpöpumpuista.
          </p>
          <p className="mt-3 text-xs text-stone-500">{IMPARTIALITY_NOTICE}</p>
          <RoleAwareLink
            href="/tarjousarvio"
            className={`${brand.btnPrimary} ${brand.btnPrimaryBlock} mt-6 inline-flex`}
          >
            Ilmainen tarjousarvio
          </RoleAwareLink>
        </div>
      </div>
    </section>
  );
}
