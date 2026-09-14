import type { LearnedCriterion } from "@/lib/template-criterion-stats";

export type LearnedCriterionWithJob = LearnedCriterion & { jobSlug: string };
import type { ProjectQualityResult } from "@/lib/project-request-quality";

function missingForTier(
  learned: LearnedCriterionWithJob[],
  quality: ProjectQualityResult,
  slug: string,
  tier: LearnedCriterion["tier"],
): LearnedCriterionWithJob[] {
  const forJob = learned.filter((c) => c.jobSlug === slug && c.tier === tier);

  return forJob.filter((c) => {
    const qualityItem = quality.items.find((i) => i.id === c.id);
    if (qualityItem) return qualityItem.status !== "done";
    if (c.id.startsWith("gap:")) return true;
    return quality.items.some((i) => i.status !== "done" && i.id === c.id);
  });
}

export function LearnedCriteriaWarnings({
  learned,
  quality,
  jobSlug,
}: {
  learned: LearnedCriterionWithJob[];
  quality: ProjectQualityResult;
  jobSlug: string | null;
}) {
  const slug = jobSlug ?? "generic";
  const strongMissing = missingForTier(learned, quality, slug, "strong");
  const hintMissing = missingForTier(learned, quality, slug, "hint");

  if (strongMissing.length === 0 && hintMissing.length === 0) return null;

  return (
    <section className="mt-4 space-y-3">
      {strongMissing.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
          <p className="text-sm font-semibold text-amber-950">
            Remonttireitin oppiva tarjouspyyntöpohja
          </p>
          <p className="mt-1 text-xs text-amber-900">
            Urakoitsijat ovat usein pyytäneet näitä tietoja{" "}
            {slug !== "generic" ? "tälle työlajille" : ""}. Suosittelemme täydentämään —
            saat yleensä tarkempia tarjouksia.
          </p>
          <ul className="mt-3 space-y-1.5">
            {strongMissing.map((c) => (
              <li key={c.id} className="text-sm text-amber-950">
                <span aria-hidden>⚠️ </span>
                <span className="font-medium">{c.label}</span>
                <span className="text-amber-900"> — {c.tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {hintMissing.length > 0 && (
        <div className="rounded-2xl border border-violet-200 bg-violet-50/60 p-4">
          <p className="text-sm font-semibold text-violet-950">Kannattaa tarkentaa</p>
          <p className="mt-1 text-xs text-violet-900">
            Nämä tiedot on pyydetty täydennettäväksi useammin kuin kerran — lisääminen
            parantaa tarjousten laatua.
          </p>
          <ul className="mt-3 space-y-1.5">
            {hintMissing.map((c) => (
              <li key={c.id} className="text-sm text-violet-950">
                <span className="font-medium">{c.label}</span>
                <span className="text-violet-900"> — {c.tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
