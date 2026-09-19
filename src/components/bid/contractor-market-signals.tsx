import type { ReactNode } from "react";
import { FairPriceTierBadge } from "@/components/bid/fair-price-tier-badge";
import {
  BID_CONVERSION_BUILDING_NOTE,
  formatBidConversionLabel,
  type ContractorBidConversionDisplay,
} from "@/lib/contractor-market-profile";
import {
  RESPONSE_TIME_BUILDING_NOTE,
  type ContractorResponseTimeDisplay,
} from "@/lib/contractor-response-time";
import {
  FAIR_PRICE_PROFILE_BUILDING_NOTE,
  type FairPriceTierDisplay,
} from "@/lib/fair-price-tier";

export function ContractorMarketSignals({
  conversion,
  responseTime,
  fairPriceTier,
  compact = false,
}: {
  conversion?: ContractorBidConversionDisplay | null;
  responseTime?: ContractorResponseTimeDisplay | null;
  fairPriceTier?: FairPriceTierDisplay | null;
  compact?: boolean;
}) {
  const items: { key: string; node: ReactNode }[] = [];

  if (fairPriceTier?.kind === "shown") {
    items.push({
      key: "price",
      node: (
        <FairPriceTierBadge
          tier={fairPriceTier.assessment.tier}
          symbols={fairPriceTier.assessment.symbols}
          tierLabel={fairPriceTier.assessment.tierLabel}
          showLabel={false}
        />
      ),
    });
  } else if (fairPriceTier?.kind === "building" && !compact) {
    items.push({
      key: "price-building",
      node: (
        <span className="text-stone-500">
          {FAIR_PRICE_PROFILE_BUILDING_NOTE(
            fairPriceTier.sampleCount,
            fairPriceTier.required,
          )}
        </span>
      ),
    });
  }

  if (conversion?.kind === "shown") {
    items.push({
      key: "conversion",
      node: (
        <span>{formatBidConversionLabel(conversion.percent)}</span>
      ),
    });
  } else if (conversion?.kind === "building" && !compact) {
    items.push({
      key: "conversion-building",
      node: (
        <span className="text-stone-500">
          {BID_CONVERSION_BUILDING_NOTE(
            conversion.sampleCount,
            conversion.required,
          )}
        </span>
      ),
    });
  }

  if (responseTime?.kind === "shown") {
    items.push({
      key: "response",
      node: (
        <span>
          <span aria-hidden="true">⚡ </span>
          {responseTime.customerLabel}
        </span>
      ),
    });
  } else if (responseTime?.kind === "building" && !compact) {
    items.push({
      key: "response-building",
      node: (
        <span className="text-stone-500">
          {RESPONSE_TIME_BUILDING_NOTE(
            responseTime.sampleCount,
            responseTime.required,
          )}
        </span>
      ),
    });
  }

  if (items.length === 0) return null;

  if (compact) {
    return (
      <ul className="mt-1.5 space-y-0.5 text-xs text-stone-600">
        {items.map(({ key, node }) => (
          <li key={key}>{node}</li>
        ))}
      </ul>
    );
  }

  return (
    <ul className="mt-2 space-y-1 text-xs text-stone-600">
      {items.map(({ key, node }) => (
        <li key={key}>{node}</li>
      ))}
    </ul>
  );
}
