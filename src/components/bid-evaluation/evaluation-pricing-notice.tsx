import {
  evaluationPricingSummary,
  formatEvaluationPriceLabel,
  type BidEvaluationSettings,
} from "@/lib/bid-evaluation";

export function EvaluationPricingNotice({
  settings,
  bidCount = 1,
  compact = false,
}: {
  settings: BidEvaluationSettings;
  bidCount?: number;
  compact?: boolean;
}) {
  const label = formatEvaluationPriceLabel(settings, bidCount);
  const summary = evaluationPricingSummary(settings, bidCount);

  if (compact) {
    return (
      <p className="text-sm text-stone-600">
        Hinta: <span className="font-medium text-stone-900">{label}</span>
      </p>
    );
  }

  return (
    <p
      className={`rounded-xl border px-4 py-3 text-sm ${
        settings.pricing_mode === "free"
          ? "border-emerald-100 bg-emerald-50/60 text-emerald-950"
          : "border-amber-100 bg-amber-50/60 text-amber-950"
      }`}
    >
      <span className="font-medium">{label}</span>
      {" — "}
      {summary}
    </p>
  );
}
