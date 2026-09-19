"use client";

import { brand, formInputClass } from "@/lib/brand-theme";
import type { CalculatorInput, CalculatorQuestion, CalculatorTier } from "@/lib/calculators/types";

const optionSelected =
  "border-sky-600 bg-sky-50 text-sky-900";
const optionIdle =
  "border-stone-200 bg-white text-stone-700 hover:border-sky-200";

export function CalculatorQuantityField({
  input,
  value,
  onChange,
}: {
  input: CalculatorInput;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-stone-700">
        {input.label} ({input.unit})
      </span>
      <input
        type="number"
        min={input.min}
        max={input.max}
        step={input.step ?? 1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || input.min)}
        className={`mt-1 w-full rounded-xl border border-stone-200 px-3 py-2.5 text-lg font-semibold ${brand.input}`}
      />
      {input.hint && (
        <span className="mt-1 block text-xs text-stone-500">{input.hint}</span>
      )}
    </label>
  );
}

export function CalculatorTierPicker({
  tiers,
  value,
  onChange,
}: {
  tiers: CalculatorTier[];
  value: string | undefined;
  onChange: (tierId: string) => void;
}) {
  if (tiers.length === 0) return null;
  return (
    <fieldset>
      <legend className="text-sm font-medium text-stone-700">
        Laite- / materiaalitaso
      </legend>
      <div className="mt-1 flex flex-wrap gap-2">
        {tiers.map((tier) => (
          <button
            key={tier.id}
            type="button"
            onClick={() => onChange(tier.id)}
            className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
              value === tier.id ? optionSelected : optionIdle
            }`}
          >
            {tier.label}
            {tier.subtitle && (
              <span className="mt-0.5 block text-xs font-normal text-stone-500">
                {tier.subtitle}
              </span>
            )}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function CalculatorOptionButtons({
  question,
  value,
  onChange,
}: {
  question: CalculatorQuestion;
  value: string;
  onChange: (optionId: string) => void;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-stone-800">{question.label}</legend>
      {question.hint && (
        <p className="mt-0.5 text-xs text-stone-500">{question.hint}</p>
      )}
      <div className="mt-2 flex flex-wrap gap-2">
        {question.options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
              value === option.id ? optionSelected : optionIdle
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function CalculatorEstimateModeToggle({
  value,
  onChange,
}: {
  value: "quick" | "detail";
  onChange: (mode: "quick" | "detail") => void;
}) {
  return (
    <div className="inline-flex rounded-xl border border-stone-200 bg-stone-50 p-1">
      <button
        type="button"
        onClick={() => onChange("quick")}
        className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
          value === "quick"
            ? "bg-white text-sky-900 shadow-sm"
            : "text-stone-600 hover:text-stone-900"
        }`}
      >
        Nopea arvio
      </button>
      <button
        type="button"
        onClick={() => onChange("detail")}
        className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
          value === "detail"
            ? "bg-white text-sky-900 shadow-sm"
            : "text-stone-600 hover:text-stone-900"
        }`}
      >
        Tarkempi arvio
      </button>
    </div>
  );
}

/** Yhteinen laskurin syöttöosio — sama ulkoasu laskurissa ja tarjouspyynnössä. */
export function CalculatorInputsSection({
  config,
  inputs,
  onChange,
  title = "Kohteen tiedot",
  description,
}: {
  config: {
    primaryInput: CalculatorInput;
    secondaryInput?: CalculatorInput;
    tiers?: CalculatorTier[];
    questions?: CalculatorQuestion[];
  };
  inputs: {
    primaryQty: number;
    secondaryQty: number;
    tierId: string | undefined;
    answers: Record<string, string>;
    estimateMode: "quick" | "detail";
  };
  onChange: (patch: Partial<typeof inputs>) => void;
  title?: string;
  description?: string;
}) {
  const hasQuestions = (config.questions?.length ?? 0) > 0;
  const visibleQuestions = (config.questions ?? []).filter(
    (q) => q.mode === "quick" || inputs.estimateMode === "detail",
  );

  return (
    <section className={`${brand.section} p-5 sm:p-6`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-stone-900">{title}</h2>
          {description && (
            <p className="mt-1 text-sm text-stone-600">{description}</p>
          )}
        </div>
        {hasQuestions && (
          <CalculatorEstimateModeToggle
            value={inputs.estimateMode}
            onChange={(estimateMode) => onChange({ estimateMode })}
          />
        )}
      </div>

      {config.primaryInput.hint && !description && (
        <p className="mt-2 text-sm text-stone-600">{config.primaryInput.hint}</p>
      )}

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <CalculatorQuantityField
          input={config.primaryInput}
          value={inputs.primaryQty}
          onChange={(primaryQty) => onChange({ primaryQty })}
        />
        {config.secondaryInput && (
          <CalculatorQuantityField
            input={config.secondaryInput}
            value={inputs.secondaryQty}
            onChange={(secondaryQty) => onChange({ secondaryQty })}
          />
        )}
      </div>

      {config.tiers && config.tiers.length > 0 && (
        <div className="mt-4">
          <CalculatorTierPicker
            tiers={config.tiers}
            value={inputs.tierId}
            onChange={(tierId) => onChange({ tierId })}
          />
        </div>
      )}

      {visibleQuestions.length > 0 && (
        <div className="mt-6 space-y-4 border-t border-stone-100 pt-5">
          <p className="text-sm text-stone-600">
            {inputs.estimateMode === "quick"
              ? "Vastaa muutamaan kysymykseen — sama rakenne kuin hintalaskurissa."
              : "Lisäkysymykset tarkentavat tarjouspyyntöä ja auttavat urakoitsijoita arvioimaan työn."}
          </p>
          {visibleQuestions.map((question) => (
            <CalculatorOptionButtons
              key={question.id}
              question={question}
              value={inputs.answers[question.id] ?? question.defaultOptionId}
              onChange={(optionId) =>
                onChange({
                  answers: { ...inputs.answers, [question.id]: optionId },
                })
              }
            />
          ))}
        </div>
      )}
    </section>
  );
}

/** RadioCards-tyylinen pill-nappi lomakkeisiin (sama kuin laskurissa). */
export function FormOptionButtons<T extends string>({
  name,
  value,
  onChange,
  options,
}: {
  name: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; hint?: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={name}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
            value === option.value ? optionSelected : optionIdle
          }`}
        >
          {option.label}
          {option.hint && (
            <span className="mt-0.5 block text-xs font-normal text-stone-500">
              {option.hint}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export { formInputClass };
