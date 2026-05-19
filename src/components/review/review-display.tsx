import { StarRatingDisplay } from "@/components/review/star-rating-display";

export function ReviewDisplay({
  rating,
  body,
  wouldRecommend,
  createdAt,
}: {
  rating: number;
  body: string | null;
  wouldRecommend: boolean | null;
  createdAt: string;
}) {
  return (
    <section className="mt-8 rounded-2xl border border-stone-200 bg-white p-6">
      <h2 className="text-lg font-semibold">Arvostelusi</h2>
      <div className="mt-3">
        <StarRatingDisplay rating={rating} size="md" />
      </div>
      {body && (
        <p className="mt-3 whitespace-pre-wrap text-sm text-stone-700">{body}</p>
      )}
      {wouldRecommend !== null && (
        <p className="mt-2 text-sm text-stone-500">
          Suosittelu: {wouldRecommend ? "Kyllä" : "Ei"}
        </p>
      )}
      <p className="mt-2 text-xs text-stone-400">
        {new Date(createdAt).toLocaleDateString("fi-FI")}
      </p>
    </section>
  );
}
