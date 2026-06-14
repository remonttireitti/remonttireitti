"use client";

import { useActionState, useMemo, useState } from "react";
import {
  updateContractorBidDefaults,
  type ContractorProfileState,
} from "@/app/actions/contractor-profile";
import { BidTermsTemplatePicker } from "@/components/bid/bid-terms-template-picker";
import {
  buildInitialDefaultsByKey,
  type BidDefaultsTab,
  type ContractorBidDefaults,
  type ContractorBidDefaultsByJobType,
} from "@/lib/contractor-bid-defaults-shared";
import type { BidTermTemplateTarget } from "@/lib/bid-term-templates";
import { brand, formInputClass } from "@/lib/brand-theme";

const inputClass = formInputClass;

export function ContractorBidDefaultsForm({
  legacy,
  byJobType,
  tabs,
  className = "",
}: {
  legacy: ContractorBidDefaults;
  byJobType: ContractorBidDefaultsByJobType;
  tabs: BidDefaultsTab[];
  className?: string;
}) {
  const [activeKey, setActiveKey] = useState(tabs[0]?.key ?? "");
  const [byJob, setByJob] = useState(() =>
    buildInitialDefaultsByKey(tabs, legacy, byJobType),
  );

  const [state, action, pending] = useActionState<
    ContractorProfileState,
    FormData
  >(updateContractorBidDefaults, {});

  const active = byJob[activeKey] ?? legacy;
  const activeTab = tabs.find((t) => t.key === activeKey);

  const jsonPayload = useMemo(() => JSON.stringify(byJob), [byJob]);

  const pumpTabs = tabs.filter((t) => t.group === "Lämpöpumput");
  const tradeTabs = tabs.filter((t) => t.group === "Ammatit");

  function updateField(
    key: string,
    field: keyof ContractorBidDefaults,
    value: string,
  ) {
    setByJob((prev) => ({
      ...prev,
      [key]: { ...(prev[key] ?? legacy), [field]: value },
    }));
  }

  function applyTemplate(
    key: string,
    target: BidTermTemplateTarget,
    text: string,
    mode: "append" | "replace",
  ) {
    setByJob((prev) => {
      const current = (prev[key] ?? legacy)[target];
      const next =
        mode === "replace"
          ? text
          : current.trim()
            ? `${current.trim()}\n\n${text}`
            : text;
      return {
        ...prev,
        [key]: { ...(prev[key] ?? legacy), [target]: next },
      };
    });
  }

  function renderTabButtons(groupTabs: BidDefaultsTab[]) {
    return groupTabs.map((tab) => (
      <button
        key={tab.key}
        type="button"
        role="tab"
        aria-selected={activeKey === tab.key}
        onClick={() => setActiveKey(tab.key)}
        className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
          activeKey === tab.key
            ? "bg-sky-800 text-white"
            : "bg-stone-100 text-stone-700 hover:bg-sky-50 hover:text-sky-900"
        }`}
      >
        {tab.label}
      </button>
    ));
  }

  if (tabs.length === 0) {
    return (
      <section className={`${brand.section} space-y-3 p-5 sm:p-6 ${className}`}>
        <h2 className={brand.sectionTitle}>Tarjouksen oletusehdot</h2>
        <p className="text-sm leading-relaxed text-stone-600">
          Valitse ensin ammatit (ja tarvittaessa lämpöpumput) urakoitsijan
          profiilissa — sen jälkeen voit asettaa työlaji- ja
          ammattikohtaiset oletusehdot tähän.
        </p>
      </section>
    );
  }

  return (
    <form
      action={action}
      className={`${brand.section} space-y-4 p-5 sm:p-6 ${className}`}
    >
      <h2 className={brand.sectionTitle}>Tarjouksen oletusehdot</h2>
      <p className={brand.sectionDesc}>
        Oletukset täyttyvät automaattisesti uuteen tarjoukseen työlajin tai
        ammatin mukaan. Käytä valmiita malleja tai kirjoita oma teksti.
      </p>

      {pumpTabs.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
            Lämpöpumput
          </p>
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Lämpöpumput">
            {renderTabButtons(pumpTabs)}
          </div>
        </div>
      )}

      {tradeTabs.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
            Ammatit
          </p>
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Ammatit">
            {renderTabButtons(tradeTabs)}
          </div>
        </div>
      )}

      <input
        type="hidden"
        name="defaults_by_job_type_json"
        value={jsonPayload}
        readOnly
      />

      <div
        key={activeKey}
        className="space-y-4 border-t border-stone-100 pt-4 xl:grid xl:grid-cols-2 xl:gap-x-8 xl:gap-y-4"
        role="tabpanel"
      >
        <p className="text-xs text-stone-500 xl:col-span-2">
          Oletukset: {activeTab?.label ?? activeKey}
        </p>

        <div>
          <label className="block text-sm font-medium">Työn laajuus</label>
          <textarea
            rows={4}
            value={active.scope_terms}
            onChange={(e) =>
              updateField(activeKey, "scope_terms", e.target.value)
            }
            className={inputClass}
          />
          <BidTermsTemplatePicker
            target="scope_terms"
            defaultsKey={activeKey}
            onApply={(text, mode) =>
              applyTemplate(activeKey, "scope_terms", text, mode)
            }
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Sopimusehdot</label>
          <textarea
            rows={4}
            value={active.contract_terms}
            onChange={(e) =>
              updateField(activeKey, "contract_terms", e.target.value)
            }
            className={inputClass}
          />
          <BidTermsTemplatePicker
            target="contract_terms"
            defaultsKey={activeKey}
            onApply={(text, mode) =>
              applyTemplate(activeKey, "contract_terms", text, mode)
            }
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Takuu työlle</label>
          <textarea
            rows={2}
            value={active.warranty_work}
            onChange={(e) =>
              updateField(activeKey, "warranty_work", e.target.value)
            }
            className={inputClass}
          />
          <BidTermsTemplatePicker
            target="warranty_work"
            defaultsKey={activeKey}
            onApply={(text, mode) =>
              applyTemplate(activeKey, "warranty_work", text, mode)
            }
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Takuu laitteelle / materiaaleille</label>
          <textarea
            rows={2}
            value={active.warranty_equipment}
            onChange={(e) =>
              updateField(activeKey, "warranty_equipment", e.target.value)
            }
            className={inputClass}
          />
          <BidTermsTemplatePicker
            target="warranty_equipment"
            defaultsKey={activeKey}
            onApply={(text, mode) =>
              applyTemplate(activeKey, "warranty_equipment", text, mode)
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
