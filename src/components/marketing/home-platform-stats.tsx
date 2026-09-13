import type { PublicPlatformStats } from "@/lib/public-platform-stats";
import { brand } from "@/lib/brand-theme";

function StatItem({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <li className="rounded-2xl border border-stone-200 bg-white px-4 py-5 text-center shadow-sm">
      <p className="text-2xl font-bold tabular-nums text-sky-800">{value}</p>
      <p className="mt-1 text-xs font-medium text-stone-600">{label}</p>
    </li>
  );
}

export function HomePlatformStats({ stats }: { stats: PublicPlatformStats }) {
  const items = [
    { value: stats.openProjects, label: "Avointa tarjouspyyntöä" },
    { value: stats.contractors, label: "Rekisteröitynyttä urakoitsijaa" },
    { value: stats.completedProjects, label: "Valmistunutta urakkaa" },
    { value: stats.reviews, label: "Julkaistua arvostelua" },
  ].filter((item) => item.value > 0);

  if (items.length === 0) return null;

  return (
    <section className="border-t border-stone-200 bg-stone-50/80 py-10">
      <div className={brand.containerWide}>
        <p className="text-center text-sm font-medium uppercase tracking-wide text-stone-500">
          Alustan tilanne nyt
        </p>
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {items.map((item) => (
            <StatItem key={item.label} value={item.value} label={item.label} />
          ))}
        </ul>
        <p className="mt-4 text-center text-xs text-stone-500">
          Luvut päivittyvät reaaliaikaisesti — emme näytä keinotekoisia
          lukemia.
        </p>
      </div>
    </section>
  );
}
