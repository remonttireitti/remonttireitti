import Link from "next/link";
import { brand } from "@/lib/brand-theme";
import type { PublicOpenProject } from "@/lib/public-projects-server";

function formatBudget(min: number | null, max: number | null): string | null {
  if (min == null && max == null) return null;
  if (min != null && max != null) return `${min.toLocaleString("fi-FI")}–${max.toLocaleString("fi-FI")} €`;
  if (min != null) return `alk. ${min.toLocaleString("fi-FI")} €`;
  return `enint. ${max!.toLocaleString("fi-FI")} €`;
}

export function HomeOpenProjects({ projects }: { projects: PublicOpenProject[] }) {
  if (projects.length === 0) return null;

  const preview = projects.slice(0, 3);

  return (
    <section className="border-t border-stone-200 bg-white py-12 sm:py-14">
      <div className={brand.containerWide}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-sky-800">
              Juuri nyt
            </p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-stone-900">
              Avoimia tarjouspyyntöjä: {projects.length}
            </h2>
            <p className="mt-2 max-w-xl text-sm text-stone-600">
              Urakoitsijat voivat tarjota ilmaiseksi. Asiakkaalle palvelu on aina
              maksuton.
            </p>
          </div>
          <Link
            href="/tarjouspyynnot"
            className={`${brand.btnSecondary} shrink-0 ${brand.btnSecondaryBlock}`}
          >
            Näytä kaikki
          </Link>
        </div>

        <ul className="mt-8 grid gap-4 sm:grid-cols-3">
          {preview.map((p) => {
            const budget = formatBudget(p.budget_min, p.budget_max);
            return (
              <li key={p.id}>
                <Link
                  href={`/tarjouspyynnot/${p.id}`}
                  className="block h-full rounded-2xl border border-stone-200 bg-stone-50/50 p-4 transition hover:border-sky-200 hover:bg-sky-50/40 hover:shadow-sm"
                >
                  <p className="text-xs font-medium text-stone-500">
                    {p.category_name}
                    {p.municipality ? ` · ${p.municipality}` : ""}
                  </p>
                  <p className="mt-1 font-semibold text-stone-900 line-clamp-2">
                    {p.title}
                  </p>
                  <p className="mt-2 text-xs text-stone-600">
                    {p.bid_count === 0
                      ? "Ei tarjouksia vielä — ole ensimmäinen"
                      : `${p.bid_count} tarjous${p.bid_count === 1 ? "" : "ta"}`}
                    {budget ? ` · ${budget}` : ""}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
