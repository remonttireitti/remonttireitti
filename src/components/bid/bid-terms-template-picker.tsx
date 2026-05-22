"use client";

import {
  heatPumpLabelForSlug,
  templatesForTarget,
  type BidTermTemplateTarget,
} from "@/lib/bid-term-templates";

export function BidTermsTemplatePicker({
  target,
  jobTypeSlug,
  onApply,
}: {
  target: BidTermTemplateTarget;
  /** Tarjouspyynnön lämpöpumppu (ilmalampopumppu / ilmavesilampopumppu / maalampopumppu). */
  jobTypeSlug?: string | null;
  onApply: (text: string, mode: "append" | "replace") => void;
}) {
  const templates = templatesForTarget(target, jobTypeSlug);
  const pumpLabel = heatPumpLabelForSlug(jobTypeSlug ?? null);

  if (templates.length === 0) {
    return (
      <p className="mt-2 text-xs text-stone-500">
        {pumpLabel
          ? `Ei valmiita malleja työlajille ${pumpLabel} — kirjoita ehdot itse.`
          : "Kirjoita ehdot itse."}
      </p>
    );
  }

  return (
    <div className="mt-2 space-y-1">
      {pumpLabel && (
        <p className="text-xs text-stone-500">
          Mallit työlajille: {pumpLabel}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
      {templates.map((t) => (
        <span key={t.id} className="inline-flex rounded-lg ring-1 ring-stone-200">
          <button
            type="button"
            onClick={() => onApply(t.text, "append")}
            className="rounded-l-lg bg-stone-50 px-2 py-1 text-xs font-medium text-stone-700 hover:bg-stone-100"
          >
            + {t.label}
          </button>
          <button
            type="button"
            title="Korvaa kentän sisältö"
            onClick={() => {
              if (
                window.confirm(
                  `Korvataanko kentän sisältö mallilla "${t.label}"?`,
                )
              ) {
                onApply(t.text, "replace");
              }
            }}
            className="rounded-r-lg border-l border-stone-200 bg-white px-1.5 py-1 text-xs text-stone-500 hover:bg-stone-50"
          >
            ↺
          </button>
        </span>
      ))}
      </div>
    </div>
  );
}
