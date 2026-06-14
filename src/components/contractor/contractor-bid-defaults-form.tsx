"use client";

import { useActionState, useMemo, useState } from "react";
import {
  updateContractorBidDefaults,
  type ContractorProfileState,
} from "@/app/actions/contractor-profile";
import { BidTermsTemplatePicker } from "@/components/bid/bid-terms-template-picker";
import {
  HEAT_PUMP_JOB_SLUGS,
  HEAT_PUMP_MARKETING,
  type HeatPumpSlug,
} from "@/constants/heat-pumps";
import {
  resolveBidDefaultsForJobType,
  type ContractorBidDefaults,
  type ContractorBidDefaultsByJobType,
} from "@/lib/contractor-bid-defaults-shared";
import type { BidTermTemplateTarget } from "@/lib/bid-term-templates";
import { brand, formInputClass } from "@/lib/brand-theme";

const inputClass = formInputClass;

function mergeDefaultsForSlug(
  slug: HeatPumpSlug,
  byJob: ContractorBidDefaultsByJobType,
  legacy: ContractorBidDefaults,
): ContractorBidDefaults {
  return resolveBidDefaultsForJobType(byJob, legacy, slug);
}

function buildInitialByJob(
  legacy: ContractorBidDefaults,
  byJob: ContractorBidDefaultsByJobType,
): Record<HeatPumpSlug, ContractorBidDefaults> {
  const out = {} as Record<HeatPumpSlug, ContractorBidDefaults>;
  for (const slug of HEAT_PUMP_JOB_SLUGS) {
    out[slug] = mergeDefaultsForSlug(slug, byJob, legacy);
  }
  return out;
}

export function ContractorBidDefaultsForm({
  legacy,
  byJobType,
  className = "",
}: {
  legacy: ContractorBidDefaults;
  byJobType: ContractorBidDefaultsByJobType;
  className?: string;
}) {
  const [activeSlug, setActiveSlug] = useState<HeatPumpSlug>("ilmalampopumppu");
  const [byJob, setByJob] = useState(() => buildInitialByJob(legacy, byJobType));

  const [state, action, pending] = useActionState<
    ContractorProfileState,
    FormData
  >(updateContractorBidDefaults, {});

  const active = byJob[activeSlug];

  const jsonPayload = useMemo(() => JSON.stringify(byJob), [byJob]);

  function updateField(
    slug: HeatPumpSlug,
    key: keyof ContractorBidDefaults,
    value: string,
  ) {
    setByJob((prev) => ({
      ...prev,
      [slug]: { ...prev[slug], [key]: value },
    }));
  }

  function applyTemplate(
    slug: HeatPumpSlug,
    target: BidTermTemplateTarget,
    text: string,
    mode: "append" | "replace",
  ) {
    setByJob((prev) => {
      const current = prev[slug][target];
      const next =
        mode === "replace"
          ? text
          : current.trim()
            ? `${current.trim()}\n\n${text}`
            : text;
      return {
        ...prev,
        [slug]: { ...prev[slug], [target]: next },
      };
    });
  }

  return (
    <form
      action={action}
      className={`${brand.section} space-y-4 p-5 sm:p-6 ${className}`}
    >
      <h2 className={brand.sectionTitle}>Tarjouksen oletusehdot</h2>
      <p className={brand.sectionDesc}>
        Oletukset täyttyvät automaattisesti uuteen tarjoukseen tyypin mukaan.
        Käytä valmiita malleja tai kirjoita oma teksti.
      </p>

      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="Lämpöpumpputyypit"
      >
        {HEAT_PUMP_JOB_SLUGS.map((slug) => (
          <button
            key={slug}
            type="button"
            role="tab"
            aria-selected={activeSlug === slug}
            onClick={() => setActiveSlug(slug)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              activeSlug === slug
                ? "bg-sky-800 text-white"
                : "bg-stone-100 text-stone-700 hover:bg-sky-50 hover:text-sky-900"
            }`}
          >
            {HEAT_PUMP_MARKETING[slug].title}
          </button>
        ))}
      </div>

      <input
        type="hidden"
        name="defaults_by_job_type_json"
        value={jsonPayload}
        readOnly
      />

      <div
        key={activeSlug}
        className="space-y-4 border-t border-stone-100 pt-4 xl:grid xl:grid-cols-2 xl:gap-x-8 xl:gap-y-4"
        role="tabpanel"
      >
        <p className="text-xs text-stone-500 xl:col-span-2">
          Oletukset: {HEAT_PUMP_MARKETING[activeSlug].title}
        </p>

        <div>
          <label className="block text-sm font-medium">Asennuksen laajuus</label>
          <textarea
            rows={4}
            value={active.scope_terms}
            onChange={(e) =>
              updateField(activeSlug, "scope_terms", e.target.value)
            }
            className={inputClass}
          />
          <BidTermsTemplatePicker
            target="scope_terms"
            jobTypeSlug={activeSlug}
            onApply={(text, mode) =>
              applyTemplate(activeSlug, "scope_terms", text, mode)
            }
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Sopimusehdot</label>
          <textarea
            rows={4}
            value={active.contract_terms}
            onChange={(e) =>
              updateField(activeSlug, "contract_terms", e.target.value)
            }
            className={inputClass}
          />
          <BidTermsTemplatePicker
            target="contract_terms"
            jobTypeSlug={activeSlug}
            onApply={(text, mode) =>
              applyTemplate(activeSlug, "contract_terms", text, mode)
            }
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Takuu työlle</label>
          <textarea
            rows={2}
            value={active.warranty_work}
            onChange={(e) =>
              updateField(activeSlug, "warranty_work", e.target.value)
            }
            className={inputClass}
          />
          <BidTermsTemplatePicker
            target="warranty_work"
            jobTypeSlug={activeSlug}
            onApply={(text, mode) =>
              applyTemplate(activeSlug, "warranty_work", text, mode)
            }
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Takuu laitteelle</label>
          <textarea
            rows={2}
            value={active.warranty_equipment}
            onChange={(e) =>
              updateField(activeSlug, "warranty_equipment", e.target.value)
            }
            className={inputClass}
          />
          <BidTermsTemplatePicker
            target="warranty_equipment"
            jobTypeSlug={activeSlug}
            onApply={(text, mode) =>
              applyTemplate(activeSlug, "warranty_equipment", text, mode)
            }
          />
        </div>
      </div>

      {state.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
          role="status"
        >
          {state.ok}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className={`${brand.btnPrimary} disabled:opacity-60`}
      >
        {pending ? "Tallennetaan…" : "Tallenna oletusehdot"}
      </button>
    </form>
  );
}
