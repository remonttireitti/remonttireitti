"use client";

import Link from "next/link";
import {
  calculatorPath,
  getCalculatorForJobType,
} from "@/lib/calculators/registry";
import { brand } from "@/lib/brand-theme";

/** Tarjouspyynnön yhteydessä: avaa työlajiin sopiva laskuri uuteen välilehteen. */
export function ProjectCalculatorBanner({
  jobSlug,
  className = "",
}: {
  jobSlug: string | null | undefined;
  className?: string;
}) {
  if (!jobSlug) return null;

  const calc = getCalculatorForJobType(jobSlug);
  if (!calc) return null;

  return (
    <aside
      className={`rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50/90 via-white to-sky-50/50 px-4 py-4 sm:px-5 ${className}`}
    >
      <p className="text-sm font-semibold text-violet-950">
        Laske hinta-arvio laskurilla
      </p>
      <p className="mt-1 text-sm leading-relaxed text-stone-700">
        {calc.title} antaa suuntaa-antavan arvion. Luo tarjouspyyntö laskelman
        pohjalta — rivihinnat eivät siirry pyyntöön, mutta budjetin voit täyttää
        laskurin viitearvoilla.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Link
          href={calculatorPath(calc.slug)}
          target="_blank"
          rel="noopener noreferrer"
          className={`${brand.btnPrimary} inline-flex text-sm`}
        >
          Avaa laskuri uuteen välilehteen →
        </Link>
        <Link
          href="/laskurit"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-violet-800 hover:underline"
        >
          Kaikki laskurit
        </Link>
      </div>
    </aside>
  );
}
