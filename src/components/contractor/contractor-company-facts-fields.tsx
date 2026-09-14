import {
  COMPANY_SIZE_BAND_OPTIONS,
  type CompanySizeBand,
} from "@/lib/contractor-company-facts";

const inputClass =
  "mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 focus:border-sky-600 focus:outline-none focus:ring-1 focus:ring-sky-600";

export function ContractorCompanyFactsFields({
  foundedYear,
  companySizeBand,
  required = false,
  inputClassName = inputClass,
}: {
  foundedYear?: number | null;
  companySizeBand?: CompanySizeBand | null;
  required?: boolean;
  inputClassName?: string;
}) {
  const currentYear = new Date().getFullYear();

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label htmlFor="founded_year" className="block text-sm font-medium">
          Perustamisvuosi{required ? " *" : ""}
        </label>
        <input
          id="founded_year"
          name="founded_year"
          type="number"
          min={1900}
          max={currentYear}
          step={1}
          required={required}
          defaultValue={foundedYear ?? ""}
          className={inputClassName}
          placeholder={String(currentYear - 5)}
        />
        <p className="mt-1 text-xs text-stone-500">
          Näkyy asiakkaalle tarjousvertailussa.
        </p>
      </div>

      <div>
        <span className="block text-sm font-medium">
          Yrityksen koko{required ? " *" : ""}
        </span>
        <div className="mt-2 space-y-2">
          {COMPANY_SIZE_BAND_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-transparent px-2 py-1.5 has-[:checked]:border-sky-300 has-[:checked]:bg-sky-50/60"
            >
              <input
                type="radio"
                name="company_size_band"
                value={option.value}
                required={required}
                defaultChecked={companySizeBand === option.value}
                className="size-4 border-stone-300 text-sky-700"
              />
              <span className="text-sm text-stone-800">{option.label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
