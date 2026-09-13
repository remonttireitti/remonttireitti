"use client";

import { useActionState } from "react";
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
}: {
  projectId?: string;
  defaultCategory?: string;
}) {
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
        <select name="category" defaultValue={defaultCategory} className={inputClass}>
          {EVALUATOR_SCOPE_AREAS.map((area) => (
            <option key={area.slug} value={area.slug}>
              {area.title}
            </option>
          ))}
        </select>
      </label>

      <label className="mt-4 block text-sm font-medium text-stone-800">
        Pumpputyyppi (vain lämpöpumpuille)
        <select name="heat_pump_type" className={inputClass} defaultValue="">
          <option value="">Ei lämpöpumppua / valitse tarvittaessa</option>
          {HEAT_PUMP_JOB_SLUGS.map((slug) => (
            <option key={slug} value={slug}>
              {HEAT_PUMP_MARKETING[slug].title}
            </option>
          ))}
        </select>
      </label>

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
