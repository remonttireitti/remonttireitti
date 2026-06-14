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
import { FREE_FORM_JOB_SLUG } from "@/constants/free-form-job";
import { SuggestedTradeChips } from "@/components/project/project-trade-scope";
import { brand } from "@/lib/brand-theme";
import { tradesForJobType } from "@/lib/project-trade-scope";
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

  const freeFormJob = useMemo(
    () => catalog.jobTypes.find((j) => j.slug === FREE_FORM_JOB_SLUG) ?? null,
    [catalog.jobTypes],
  );

  function selectFreeForm() {
    setAreaSlug(null);
    if (freeFormJob) onJobTypeChange(freeFormJob);
  }

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
          Mitä palvelua tai remonttia tarvitset?
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PROJECT_AREAS.map((area) => (
            <button
              key={area.slug}
              type="button"
              onClick={() => selectArea(area.slug)}
              className="rounded-xl border border-stone-200 bg-white p-4 text-left transition-colors hover:border-sky-300 hover:bg-sky-50/40"
            >
              <span className="font-semibold text-stone-900">{area.title}</span>
              <span className="mt-1 block text-sm text-stone-600">
                {area.description}
              </span>
            </button>
          ))}
          {freeFormJob && (
            <button
              type="button"
              onClick={selectFreeForm}
              className={`rounded-xl border p-4 text-left transition-colors sm:col-span-2 lg:col-span-3 ${
                jobTypeId === freeFormJob.id
                  ? brand.selectedCard
                  : "border-dashed border-stone-300 bg-stone-50/80 hover:border-amber-300 hover:bg-amber-50/40"
              }`}
            >
              <span className="font-semibold text-stone-900">
                En löydä listalta — kuvaile itse
              </span>
              <span className="mt-1 block text-sm text-stone-600">
                Vapaamuotoinen tarjouspyyntö. Kerro seuraavassa vaiheessa mitä
                remonttia tai työtä tarvitset — seurataan kysyntää ja lisätään
                suositut tyypit valikoimaan.
              </span>
            </button>
          )}
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
              {!pumpMeta && (
                <SuggestedTradeChips
                  trades={tradesForJobType(catalog.trades, jt)}
                />
              )}
            </button>
          );
        })
        )}
      </div>
    </div>
  );
}
