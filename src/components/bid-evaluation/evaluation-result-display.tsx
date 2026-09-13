import {
  BID_EVALUATION_DIMENSIONS,
  BID_EVALUATION_VERDICT_LABELS,
  IMPARTIALITY_NOTICE,
  averageScore,
} from "@/lib/bid-evaluation";
import type {
  BidEvaluationItemRow,
  BidEvaluationItemScoreRow,
  BidEvaluationReviewRow,
} from "@/lib/bid-evaluation-server";
import { formatEurosFromCents } from "@/lib/bids";

export function EvaluationResultDisplay({
  items,
  review,
  scores,
  filesByItem,
}: {
  items: BidEvaluationItemRow[];
  review: BidEvaluationReviewRow;
  scores: BidEvaluationItemScoreRow[];
  filesByItem: Map<string, { original_name: string | null; url: string }[]>;
}) {
  return (
    <div className="space-y-6">
      <p className="rounded-lg border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-950">
        {IMPARTIALITY_NOTICE}
      </p>

      {review.summary && (
        <section className="rounded-2xl border border-stone-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-stone-900">Yhteenveto</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-stone-700">
            {review.summary}
          </p>
        </section>
      )}

      {review.questions_for_contractor && (
        <section className="rounded-2xl border border-amber-100 bg-amber-50/60 p-5">
          <h2 className="font-semibold text-amber-950">Kysymyksiä urakoitsijoille</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-amber-950">
            {review.questions_for_contractor}
          </p>
        </section>
      )}

      {items.map((item) => {
        const itemScores = scores.filter((s) => s.item_id === item.id);
        const overall = itemScores.find((s) => s.dimension === "overall");
        const avg = averageScore(itemScores.map((s) => s.score));
        const files = filesByItem.get(item.id) ?? [];

        return (
          <section
            key={item.id}
            className="rounded-2xl border border-stone-200 bg-white p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="text-lg font-semibold text-stone-900">{item.label}</h3>
                {item.device_brand && (
                  <p className="text-sm text-stone-600">{item.device_brand}</p>
                )}
              </div>
              <div className="text-right">
                {item.amount_cents != null && (
                  <p className="font-semibold text-stone-900">
                    {formatEurosFromCents(item.amount_cents)}
                  </p>
                )}
                {overall?.verdict && (
                  <span
                    className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${BID_EVALUATION_VERDICT_LABELS[overall.verdict].className}`}
                  >
                    {BID_EVALUATION_VERDICT_LABELS[overall.verdict].label}
                  </span>
                )}
                {avg != null && (
                  <p className="mt-1 text-xs text-stone-500">
                    Keskiarvo: {avg.toFixed(1)} / 5
                  </p>
                )}
              </div>
            </div>

            <ul className="mt-4 space-y-2">
              {BID_EVALUATION_DIMENSIONS.filter((d) => d.id !== "overall").map(
                (dim) => {
                  const row = itemScores.find((s) => s.dimension === dim.id);
                  if (!row?.score && !row?.note) return null;
                  return (
                    <li key={dim.id} className="text-sm text-stone-700">
                      <span className="font-medium">{dim.label}:</span>{" "}
                      {row.score ? `${row.score}/5` : "—"}
                      {row.note && (
                        <span className="block text-stone-600">{row.note}</span>
                      )}
                    </li>
                  );
                },
              )}
              {overall?.note && (
                <li className="text-sm font-medium text-stone-800">
                  Kokonaisarvio: {overall.note}
                </li>
              )}
            </ul>

            {files.length > 0 && (
              <ul className="mt-3 text-sm">
                {files.map((f, i) => (
                  <li key={i}>
                    <a
                      href={f.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-800 hover:underline"
                    >
                      {f.original_name ?? "Liite"}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
