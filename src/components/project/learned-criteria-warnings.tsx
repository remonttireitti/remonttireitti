import type { LearnedCriterion } from "@/lib/template-criterion-stats";

export type LearnedCriterionWithJob = LearnedCriterion & { jobSlug: string };
import type { ProjectQualityResult } from "@/lib/project-request-quality";

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
  const forJob = learned.filter((c) => c.jobSlug === slug);

  const strongMissing = forJob.filter((c) => {
    if (c.tier !== "strong") return false;
    const qualityItem = quality.items.find((i) => i.id === c.id);
    if (qualityItem) return qualityItem.status !== "done";
    if (c.id.startsWith("gap:")) return true;
    return quality.items.some((i) => i.status !== "done" && i.id === c.id);
  });

  if (strongMissing.length === 0) return null;

  return (
    <section className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
      <p className="text-sm font-semibold text-amber-950">
        Remonttireitin oppiva tarjouspyyntöpohja
      </p>
      <p className="mt-1 text-xs text-amber-900">
        Urakoitsijat ovat usein pyytäneet näitä tietoja{" "}
        {slug !== "generic" ? "tälle työlajille" : ""}. Täydennä ennen julkaisua —
        saat tarkempia tarjouksia heti.
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
    </section>
  );
}
