"use client";

import type { LearnedProposal } from "@/lib/learned-proposals";

export function LearnedAddonsPicker({
  jobSlug,
  description,
  onDescriptionChange,
  learnedProposals,
}: {
  jobSlug: string | null;
  description: string;
  onDescriptionChange: (value: string) => void;
  learnedProposals: LearnedProposal[];
}) {
  const slug = jobSlug ?? "generic";
  const addons = learnedProposals.filter(
    (p) => p.jobSlug === slug && p.kind === "addon",
  );

  if (addons.length === 0) return null;

  const norm = description.toLowerCase();

  function isSelected(label: string): boolean {
    return norm.includes(label.toLowerCase());
  }

  function toggle(label: string, checked: boolean) {
    if (checked) {
      const line = `• Lisätyö: ${label}`;
      onDescriptionChange(
        description.trim() ? `${description.trim()}\n${line}` : line,
      );
      return;
    }
    const lines = description
      .split("\n")
      .filter((line) => !line.toLowerCase().includes(label.toLowerCase()));
    onDescriptionChange(lines.join("\n").trim());
  }

  return (
    <fieldset className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
      <legend className="px-1 text-sm font-semibold text-emerald-950">
        Haluatko tehdä samalla?
      </legend>
      <p className="text-xs leading-relaxed text-emerald-900/90">
        Nämä lisätyöt ovat yleisiä tälle remontille — urakoitsijat ovat ehdottaneet
        niitä usein aiemmissa tarjouspyynnöissä.
      </p>
      <ul className="mt-3 space-y-2">
        {addons.map((addon) => (
          <li key={addon.slug}>
            <label className="flex cursor-pointer items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={isSelected(addon.label)}
                onChange={(e) => toggle(addon.label, e.target.checked)}
                className="mt-0.5"
              />
              <span>
                <span className="font-medium text-stone-900">{addon.label}</span>
                <span className="ml-1 text-xs text-stone-500">
                  (ehdotettu {addon.requestCount} kertaa
                  {addon.tier === "strong" ? " — yleinen lisä" : ""})
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}
