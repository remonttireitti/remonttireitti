"use client";

import {
  HEAT_PUMP_JOB_SLUGS,
  HEAT_PUMP_MARKETING,
} from "@/constants/heat-pumps";
import { brand } from "@/lib/brand-theme";
import type { JobCatalog, JobTypeWithTrades } from "@/types/job-catalog";

type Props = {
  catalog: JobCatalog;
  jobTypeId: string;
  onJobTypeChange: (jobType: JobTypeWithTrades | null) => void;
};

export function HeatPumpTypeStep({
  catalog,
  jobTypeId,
  onJobTypeChange,
}: Props) {
  const options = HEAT_PUMP_JOB_SLUGS.map((slug) => {
    const jt = catalog.jobTypes.find((j) => j.slug === slug);
    const meta = HEAT_PUMP_MARKETING[slug];
    return { slug, jt, meta };
  }).filter((o) => o.jt);

  function select(jt: JobTypeWithTrades) {
    onJobTypeChange(jt);
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-stone-600">
        Valitse lämpöpumpun tyyppi. Pyyntö menee automaattisesti oikeille
        asentajille (sähkö, LVI jne.) — sinun ei tarvitse valita ammatteja erikseen.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {options.map(({ slug, jt, meta }) => {
          if (!jt) return null;
          const active = jobTypeId === jt.id;
          return (
            <button
              key={slug}
              type="button"
              onClick={() => select(jt)}
              className={`rounded-xl border p-4 text-left transition-colors ${
                active
                  ? brand.selectedCard
                  : "border-stone-200 bg-white hover:border-sky-200"
              }`}
            >
              <span className="font-semibold">{meta.title}</span>
              <span className="mt-1 block text-sm text-stone-600">
                {meta.description}
              </span>
              <span className="mt-2 block text-xs text-stone-500">{meta.hint}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
