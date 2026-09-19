import { FairPriceTierBadge } from "@/components/bid/fair-price-tier-badge";
import {
  FAIR_PRICE_PROFILE_BUILDING_NOTE,
  type FairPriceTierDisplay,
} from "@/lib/fair-price-tier";

export function FairPriceTierDisplayCell({
  display,
  compact = false,
}: {
  display: FairPriceTierDisplay | null | undefined;
  compact?: boolean;
}) {
  if (!display || display.kind === "none") {
    return <span className="text-stone-400">—</span>;
  }

  if (display.kind === "building") {
    return (
      <span className="text-xs leading-relaxed text-stone-500">
        {FAIR_PRICE_PROFILE_BUILDING_NOTE(
          display.sampleCount,
          display.required,
        )}
      </span>
    );
  }

  const { assessment, source } = display;
  const unreliable =
    source === "project" &&
    !assessment.isProfileReliable &&
    assessment.profileSampleCount < 10;

  return (
    <div className={compact ? "" : "space-y-1"}>
      <FairPriceTierBadge
        tier={assessment.tier}
        symbols={assessment.symbols}
        tierLabel={assessment.tierLabel}
        showLabel={!compact}
        unreliable={unreliable}
      />
      {source === "profile" && (
        <p className="text-xs text-stone-500">Profiilin hintataso</p>
      )}
      {unreliable && (
        <p className="text-xs text-stone-500">
          * Tämän työn arvio — profiili vahvistuu{" "}
          {10 - assessment.profileSampleCount} tarjouksen jälkeen
        </p>
      )}
    </div>
  );
}
