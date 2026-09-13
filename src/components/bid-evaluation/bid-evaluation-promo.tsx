import Link from "next/link";
import { brand } from "@/lib/brand-theme";

export function BidEvaluationPromo({
  projectId,
  className = "mt-6",
}: {
  projectId: string;
  className?: string;
}) {
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
        href={`/tarjousarvio/uusi?project=${projectId}`}
        className={`${brand.link} mt-3 inline-block text-sm font-semibold`}
      >
        Pyydä tarjousarvio →
      </Link>
    </section>
  );
}
