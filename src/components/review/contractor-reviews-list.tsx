import { StarRatingDisplay } from "@/components/review/star-rating-display";
import type { PublicContractorReview } from "@/lib/public-contractor-server";

export function ContractorReviewsList({
  reviews,
}: {
  reviews: PublicContractorReview[];
}) {
  if (reviews.length === 0) {
    return (
      <p className="text-sm text-stone-600">
        Ei vielä julkisia arvosteluja. Arvostelut tulevat näkyviin valmistuneista
        urakoista.
      </p>
    );
  }

  return (
    <ol className="divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-white">
      {reviews.map((review) => (
        <li key={review.id} className="px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <StarRatingDisplay rating={review.rating} size="sm" />
            <span className="text-xs text-stone-500">
              {new Date(review.created_at).toLocaleDateString("fi-FI")}
            </span>
          </div>
          <p className="mt-1 text-xs font-medium text-stone-500">
            {review.project_title}
          </p>
          {review.body && (
            <p className="mt-2 text-sm leading-relaxed text-stone-700">
              {review.body}
            </p>
          )}
          {review.would_recommend !== null && (
            <p className="mt-2 text-xs text-stone-500">
              Suosittelu: {review.would_recommend ? "Kyllä" : "Ei"}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}
