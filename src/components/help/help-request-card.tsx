import Link from "next/link";
import {
  helpCategoryEmoji,
  helpCategoryLabel,
} from "@/lib/help-categories";
import {
  formatHelpDistance,
  formatHelpWindow,
  type HelpRequestWithDistance,
} from "@/lib/help-requests-shared";

export function HelpRequestCard({ request }: { request: HelpRequestWithDistance }) {
  const emoji = helpCategoryEmoji(request.category);
  const dist = formatHelpDistance(request.distance_km);

  return (
    <Link
      href={`/apu/${request.id}`}
      className="block rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:border-rose-200 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          {request.urgency === "now" && (
            <span className="mb-2 inline-block rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-800">
              Tarvitaan nyt
            </span>
          )}
          <p className="text-xs font-medium text-stone-500">
            {emoji} {helpCategoryLabel(request.category)}
            {dist ? ` · ${dist} päässä` : ""}
          </p>
          <h2 className="mt-1 text-lg font-semibold text-stone-900">{request.title}</h2>
        </div>
        <span className="shrink-0 text-2xl" aria-hidden>
          🆘
        </span>
      </div>
      <p className="mt-2 line-clamp-2 text-sm text-stone-600">{request.description}</p>
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-stone-500">
        <span>👥 {request.people_needed} henkilöä</span>
        <span>🕐 {formatHelpWindow(request.window_start, request.window_end)}</span>
        <span>❤️ Vapaaehtoinen apu</span>
      </div>
    </Link>
  );
}
