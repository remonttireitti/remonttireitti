import type { ProjectQualityResult } from "@/lib/project-request-quality";

function scoreColor(score: number): string {
  if (score >= 90) return "text-emerald-700";
  if (score >= 75) return "text-sky-700";
  if (score >= 55) return "text-amber-700";
  return "text-stone-600";
}

function ringColor(score: number): string {
  if (score >= 90) return "stroke-emerald-500";
  if (score >= 75) return "stroke-sky-500";
  if (score >= 55) return "stroke-amber-500";
  return "stroke-stone-400";
}

export function ProjectQualityScorePanel({
  quality,
  compact = false,
}: {
  quality: ProjectQualityResult;
  compact?: boolean;
}) {
  const missing = quality.items.filter((i) => i.status === "missing");
  const partial = quality.items.filter((i) => i.status === "partial");

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-5">
      <div className="flex flex-wrap items-start gap-4">
        <div className="relative flex size-20 shrink-0 items-center justify-center">
          <svg className="size-20 -rotate-90" viewBox="0 0 36 36" aria-hidden>
            <circle
              cx="18"
              cy="18"
              r="15.5"
              fill="none"
              className="stroke-stone-200"
              strokeWidth="3"
            />
            <circle
              cx="18"
              cy="18"
              r="15.5"
              fill="none"
              className={ringColor(quality.score)}
              strokeWidth="3"
              strokeDasharray={`${quality.score} 100`}
              strokeLinecap="round"
            />
          </svg>
          <span className={`absolute text-lg font-bold ${scoreColor(quality.score)}`}>
            {quality.score}%
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium uppercase tracking-wide text-stone-500">
            Tarjouspyynnön laatupiste
          </p>
          <p className={`mt-1 text-lg font-semibold ${scoreColor(quality.score)}`}>
            {quality.label}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-stone-600">{quality.summary}</p>
          <p className="mt-2 text-xs leading-relaxed text-stone-500">
            Laatupiste on vinkki, ei este — voit julkaista myös suppeammalla pyynnöllä.
          </p>
        </div>
      </div>

      {!compact && (missing.length > 0 || partial.length > 0) && (
        <div className="mt-4 space-y-3 border-t border-stone-100 pt-4">
          {missing.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-600">
                Voisi vielä täydentää
              </p>
              <ul className="mt-2 space-y-1.5">
                {missing.map((item) => (
                  <li key={item.id} className="text-sm text-stone-700">
                    <span className="font-medium text-stone-900">{item.label}</span>
                    {" — "}
                    {item.tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {partial.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                Kannattaa tarkentaa
              </p>
              <ul className="mt-2 space-y-1.5">
                {partial.map((item) => (
                  <li key={item.id} className="text-sm text-stone-700">
                    <span className="font-medium text-stone-900">{item.label}</span>
                    {" — "}
                    {item.tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
