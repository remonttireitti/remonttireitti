"use client";

import { useMemo, useState } from "react";
import {
  HEAT_PUMP_MARKETING,
} from "@/constants/heat-pumps";
import {
  PROJECT_AREAS,
  areaForJobSlug,
  isHeatPumpJobSlug,
  type ProjectAreaSlug,
} from "@/constants/project-areas";
import { brand } from "@/lib/brand-theme";
import type { JobCatalog, JobTypeWithTrades } from "@/types/job-catalog";

type Props = {
  catalog: JobCatalog;
  jobTypeId: string;
  onJobTypeChange: (jobType: JobTypeWithTrades | null) => void;
};

export function ProjectAreaJobStep({
  catalog,
  jobTypeId,
  onJobTypeChange,
}: Props) {
  const selectedJob = useMemo(
    () => catalog.jobTypes.find((j) => j.id === jobTypeId) ?? null,
    [catalog.jobTypes, jobTypeId],
  );

  const initialArea = selectedJob ? areaForJobSlug(selectedJob.slug)?.slug ?? null : null;
  const [areaSlug, setAreaSlug] = useState<ProjectAreaSlug | null>(initialArea);

  const activeArea = PROJECT_AREAS.find((a) => a.slug === areaSlug) ?? null;

  const jobsInArea = useMemo(() => {
    if (!activeArea) return [];
    return activeArea.jobSlugs
      .map((slug) => catalog.jobTypes.find((j) => j.slug === slug))
      .filter(Boolean) as JobTypeWithTrades[];
  }, [activeArea, catalog.jobTypes]);

  function selectArea(slug: ProjectAreaSlug) {
    setAreaSlug(slug);
    if (selectedJob && areaForJobSlug(selectedJob.slug)?.slug !== slug) {
      onJobTypeChange(null);
    }
  }

  function backToAreas() {
    setAreaSlug(null);
    onJobTypeChange(null);
  }

  if (!activeArea) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-stone-900">
          Mitä remonttia tarvitset?
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PROJECT_AREAS.map((area) => (
            <button
              key={area.slug}
              type="button"
              onClick={() => selectArea(area.slug)}
              className={`rounded-xl border p-4 text-left transition-colors hover:border-sky-300 hover:bg-sky-50/40 ${
                area.slug === "lammitys"
                  ? "border-sky-200 bg-sky-50/60"
                  : "border-stone-200 bg-white"
              }`}
            >
              <span className="font-semibold text-stone-900">{area.title}</span>
              <span className="mt-1 block text-sm text-stone-600">
                {area.description}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={backToAreas}
        className="text-sm text-sky-700 hover:underline"
      >
        ← Kaikki osiot
      </button>
      <div>
        <h2 className="text-lg font-semibold text-stone-900">
          {activeArea.title}
        </h2>
        <p className="mt-1 text-sm text-stone-600">{activeArea.description}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {jobsInArea.length === 0 ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 sm:col-span-2">
            Tämän osion tyypit eivät latautuneet. Päivitä sivu — jos vika jatkuu,
            ota yhteyttä tukeen.
          </p>
        ) : (
          jobsInArea.map((jt) => {
          const active = jobTypeId === jt.id;
          const pumpMeta = isHeatPumpJobSlug(jt.slug)
            ? HEAT_PUMP_MARKETING[jt.slug]
            : null;

          return (
            <button
              key={jt.id}
              type="button"
              onClick={() => onJobTypeChange(jt)}
              className={`rounded-xl border p-4 text-left transition-colors ${
                active ? brand.selectedCard : "border-stone-200 bg-white hover:border-sky-200"
              }`}
            >
              <span className="font-semibold">
                {pumpMeta?.title ?? jt.name_fi}
              </span>
              <span className="mt-1 block text-sm text-stone-600">
                {pumpMeta?.description ?? jt.description_fi}
              </span>
              {pumpMeta?.hint && (
                <span className="mt-2 block text-xs text-stone-500">
                  {pumpMeta.hint}
                </span>
              )}
            </button>
          );
        })
        )}
      </div>
    </div>
  );
}
