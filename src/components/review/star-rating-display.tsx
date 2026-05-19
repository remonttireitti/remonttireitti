import { formatRatingStars } from "@/lib/reviews";

export function StarRatingDisplay({
  rating,
  count,
  size = "sm",
}: {
  rating: number;
  count?: number;
  size?: "sm" | "md";
}) {
  const text = size === "md" ? "text-base" : "text-sm";
  return (
    <span className={`inline-flex items-center gap-1.5 ${text}`}>
      <span className="text-amber-500" aria-hidden>
        {formatRatingStars(rating)}
      </span>
      <span className="font-medium text-stone-700">{rating.toFixed(1)}</span>
      {count !== undefined && count > 0 && (
        <span className="text-stone-500">({count} arvostelua)</span>
      )}
    </span>
  );
}
