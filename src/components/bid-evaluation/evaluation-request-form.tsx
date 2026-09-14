"use client";

import { useActionState, useState } from "react";
import {
  createBidEvaluationRequest,
  type BidEvaluationActionState,
} from "@/app/actions/bid-evaluation";
import { EVALUATOR_SCOPE_AREAS } from "@/lib/evaluator-scopes";
import { HEAT_PUMP_JOB_SLUGS, HEAT_PUMP_MARKETING } from "@/constants/heat-pumps";
import { brand } from "@/lib/brand-theme";
import { IMPARTIALITY_NOTICE } from "@/lib/bid-evaluation";

const inputClass =
  "mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-sky-600 focus:outline-none focus:ring-1 focus:ring-sky-600";

export function EvaluationRequestForm({
  projectId,
  defaultCategory = "lammitys",
  defaultHeatPumpType,
  showHeatPumpField = false,
  availableCategories,
}: {
  projectId?: string;
  defaultCategory?: string;
  defaultHeatPumpType?: string;
  showHeatPumpField?: boolean;
  /** Jos annettu, näytetään vain alueet joilla on arvioija. */
  availableCategories?: string[];
}) {
  const categoryOptions = availableCategories?.length
    ? EVALUATOR_SCOPE_AREAS.filter((area) =>
        availableCategories.includes(area.slug),
      )
    : EVALUATOR_SCOPE_AREAS;
  const [category, setCategory] = useState(defaultCategory);
  const showPump =
    showHeatPumpField || category === "lammitys" || category === "heat_pump";
  const [state, action, pending] = useActionState<
    BidEvaluationActionState,
    FormData
  >(createBidEvaluationRequest, {});

  return (
    <form action={action} className={`${brand.section} p-6`}>
      {projectId && <input type="hidden" name="project_id" value={projectId} />}

      <p className="rounded-lg border border-sky-100 bg-sky-50/80 px-4 py-3 text-sm text-sky-950">
        {IMPARTIALITY_NOTICE}
      </p>

      <label className="mt-5 block text-sm font-medium text-stone-800">
        Remontin alue
        <select
          name="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className={inputClass}
        >
          {categoryOptions.map((area) => (
            <option key={area.slug} value={area.slug}>
              {area.title}
            </option>
          ))}
        </select>
      </label>

      {showPump && (
        <label className="mt-4 block text-sm font-medium text-stone-800">
          Pumpputyyppi
          <select
            name="heat_pump_type"
            className={inputClass}
            defaultValue={defaultHeatPumpType ?? ""}
          >
            <option value="">Valitse pumpputyyppi</option>
            {HEAT_PUMP_JOB_SLUGS.map((slug) => (
              <option key={slug} value={slug}>
                {HEAT_PUMP_MARKETING[slug].title}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="mt-4 block text-sm font-medium text-stone-800">
        Taustaa arvioijalle (valinnainen)
        <textarea
          name="context_notes"
          rows={4}
          className={inputClass}
          placeholder="Esim. talon koko, nykyinen lämmitys, toiveet…"
        />
      </label>

      {state.error && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className={`${brand.btnPrimary} mt-6 disabled:opacity-60`}
      >
        {pending ? "Luodaan…" : "Jatka — lisää tarjoukset"}
      </button>
    </form>
  );
}
