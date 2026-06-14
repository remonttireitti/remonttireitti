"use client";

import {
  defaultsKeyLabel,
  templatesForTarget,
  type BidTermTemplateTarget,
} from "@/lib/bid-term-templates";

export function BidTermsTemplatePicker({
  target,
  defaultsKey,
  jobTypeSlug,
  onApply,
}: {
  target: BidTermTemplateTarget;
  /** Oletusehtojen avain: työlaji tai trade:ammatti */
  defaultsKey?: string | null;
  /** @deprecated Käytä defaultsKey */
  jobTypeSlug?: string | null;
  onApply: (text: string, mode: "append" | "replace") => void;
}) {
  const key = defaultsKey ?? jobTypeSlug ?? null;
  const templates = templatesForTarget(target, key);
  const label = defaultsKeyLabel(key);

  if (templates.length === 0) {
    return (
      <p className="mt-2 text-xs text-stone-500">
        {target === "scope_terms" && !key
          ? "Valmiit mallit näkyvät, kun valitset työlajin tai ammatin yllä. Kirjoita ehdot itse tai käytä yleisiä malleja sopimus- ja takuukentissä."
          : label
            ? `Ei valmiita malleja kohteelle ${label} — kirjoita ehdot itse tai käytä yleisiä malleja muissa kentissä.`
            : "Kirjoita ehdot itse."}
      </p>
    );
  }

  return (
    <div className="mt-2 space-y-1">
      {label && (
        <p className="text-xs text-stone-500">Mallit: {label}</p>
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
