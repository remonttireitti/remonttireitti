"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { brand } from "@/lib/brand-theme";

export type CalculatorsIndexItem = {
  slug: string;
  href: string;
  title: string;
  description: string;
  /** Lowercased blob: title, description, intro, slug, aliases, area, hints */
  searchText: string;
};

export type CalculatorsIndexGroup = {
  areaSlug: string;
  areaTitle: string;
  calculators: CalculatorsIndexItem[];
};

function matchesQuery(item: CalculatorsIndexItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const parts = q.split(/\s+/).filter(Boolean);
  return parts.every((part) => item.searchText.includes(part));
}

export function CalculatorsIndexSearch({
  groups,
}: {
  groups: CalculatorsIndexGroup[];
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return groups;
    return groups
      .map((group) => ({
        ...group,
        calculators: group.calculators.filter((c) => matchesQuery(c, q)),
      }))
      .filter((group) => group.calculators.length > 0);
  }, [groups, query]);

  const totalMatches = useMemo(
    () => filtered.reduce((n, g) => n + g.calculators.length, 0),
    [filtered],
  );

  const hasQuery = query.trim().length > 0;

  return (
    <section className="mt-12 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="text-lg font-bold text-stone-900">
          Kaikki laskurit alueittain
        </h2>
        <div className="w-full sm:max-w-md" role="search">
          <label htmlFor="laskurit-haku" className="sr-only">
            Hae laskuria
          </label>
          <input
            id="laskurit-haku"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Hae laskuria…"
            autoComplete="off"
            enterKeyHint="search"
            className={`min-h-[2.75rem] w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 shadow-sm ${brand.input}`}
          />
        </div>
      </div>

      {hasQuery && (
        <p className="text-sm text-stone-600" aria-live="polite">
          {totalMatches === 0
            ? null
            : `${totalMatches} hakutulosta haulle ”${query.trim()}”.`}
        </p>
      )}

      {hasQuery && totalMatches === 0 ? (
        <div
          className="rounded-xl border border-stone-200 bg-white p-6 text-stone-600"
          role="status"
        >
          <p className="font-medium text-stone-800">Ei hakutuloksia</p>
          <p className="mt-1 text-sm">
            Kokeile toista hakusanaa, esimerkiksi ”keittiö”, ”katto” tai
            ”lämpöpumppu”.
          </p>
          <button
            type="button"
            onClick={() => setQuery("")}
            className="mt-3 text-sm font-medium text-sky-800 hover:underline"
          >
            Tyhjennä haku
          </button>
        </div>
      ) : (
        <div className="space-y-10">
          {filtered.map((group) => (
            <section key={group.areaSlug} aria-labelledby={`area-${group.areaSlug}`}>
              <h3
                id={`area-${group.areaSlug}`}
                className="text-base font-semibold text-stone-800"
              >
                {group.areaTitle}
              </h3>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {group.calculators.map((calc) => (
                  <li key={calc.slug}>
                    <Link
                      href={calc.href}
                      className="block h-full rounded-2xl border border-stone-200 bg-white p-4 transition hover:border-sky-300 hover:shadow-md"
                    >
                      <p className="font-semibold text-stone-900">{calc.title}</p>
                      <p className="mt-1 line-clamp-2 text-sm text-stone-600">
                        {calc.description}
                      </p>
                      <p className="mt-2 text-sm font-medium text-sky-700">
                        Avaa laskuri →
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
