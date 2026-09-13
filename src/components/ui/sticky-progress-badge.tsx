type StickyProgressBadgeProps = {
  done: number;
  total: number;
  label?: string;
  variant?: "sky" | "violet";
  className?: string;
};

const variantClasses = {
  sky: "border-sky-200 text-sky-900",
  violet: "border-violet-200 text-violet-950",
} as const;

export function StickyProgressBadge({
  done,
  total,
  label = "valmis",
  variant = "sky",
  className = "",
}: StickyProgressBadgeProps) {
  if (total <= 0) return null;

  const percent = Math.round((done / total) * 100);

  return (
    <div
      className={`sticky top-[5.25rem] z-30 flex justify-end py-2 ${className}`}
      role="status"
      aria-live="polite"
      aria-label={`${percent} prosenttia valmis, ${done} / ${total} ${label}`}
    >
      <div
        className={`inline-flex items-center gap-2 rounded-full border bg-white/95 px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur-sm ${variantClasses[variant]}`}
      >
        <span className="tabular-nums text-sm font-semibold">{percent} %</span>
        <span className="hidden text-stone-300 sm:inline" aria-hidden>
          ·
        </span>
        <span className="hidden tabular-nums sm:inline">
          {done}/{total} {label}
        </span>
      </div>
    </div>
  );
}
