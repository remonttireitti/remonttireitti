import Link from "next/link";
import type { BidEvaluationCategory } from "@/lib/bid-evaluation";
import { brand } from "@/lib/brand-theme";
import { isHeatPumpJobSlug } from "@/constants/project-areas";

export function BidEvaluationPromo({
  projectId,
  category,
  jobSlug,
  className = "mt-6",
}: {
  projectId: string;
  category: BidEvaluationCategory;
  jobSlug?: string | null;
  className?: string;
}) {
  const params = new URLSearchParams({ project: projectId, category });
  if (jobSlug && isHeatPumpJobSlug(jobSlug)) {
    params.set("pump", jobSlug);
  }

  return (
    <section
      className={`${className} rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50/80 to-white p-5`}
    >
      <h2 className="text-base font-semibold text-stone-900">Tarjousvahti</h2>
      <p className="mt-1 text-sm text-stone-600">
        Epävarma tarjouksista? Pyydä ilmainen puolueeton arvio — autamme ymmärtämään
        hintaa ja sisältöä. Päätös urakoitsijasta on aina sinun.
      </p>
      <Link
        href={`/tarjousarvio/uusi?${params}`}
        className={`${brand.link} mt-3 inline-block text-sm font-semibold`}
      >
        Pyydä tarjousarvio →
      </Link>
    </section>
  );
}
