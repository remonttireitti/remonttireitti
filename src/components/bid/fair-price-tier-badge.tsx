import type { PriceTier } from "@/lib/fair-price-tier";
import { formatPriceTierSymbols, PRICE_TIER_LABELS } from "@/lib/fair-price-tier";

export function FairPriceTierBadge({
  tier,
  symbols,
  tierLabel,
  showLabel = false,
  unreliable = false,
  className = "",
}: {
  tier: PriceTier;
  symbols?: string;
  tierLabel?: string;
  showLabel?: boolean;
  unreliable?: boolean;
  className?: string;
}) {
  const displaySymbols = symbols ?? formatPriceTierSymbols(tier);
  const label = tierLabel ?? PRICE_TIER_LABELS[tier];

  return (
    <span className={`inline-flex flex-col ${className}`}>
      <span
        className="font-semibold tracking-wide text-amber-700"
        title={label}
        aria-label={`Hintataso: ${label}`}
      >
        {displaySymbols}
        {unreliable && (
          <span
            className="ml-1 text-xs font-normal text-stone-400"
            title="Profiilin hintataso vahvistuu 10 tarjouksen jälkeen"
          >
            *
          </span>
        )}
      </span>
      {showLabel && (
        <span className="text-xs text-stone-500">{label}</span>
      )}
    </span>
  );
}
