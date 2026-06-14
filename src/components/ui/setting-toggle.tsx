"use client";

type SettingToggleProps = {
  name: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  onLabel?: string;
  offLabel?: string;
};

export function SettingToggle({
  name,
  checked,
  onChange,
  label,
  description,
  disabled = false,
  onLabel = "Päällä",
  offLabel = "Pois",
}: SettingToggleProps) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <input type="hidden" name={name} value={checked ? "on" : "off"} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-stone-900">{label}</p>
        {description && (
          <p className="mt-0.5 text-xs leading-relaxed text-stone-500">
            {description}
          </p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={`${label}: ${checked ? onLabel : offLabel}`}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`group flex shrink-0 items-center gap-2 rounded-full border px-1 py-1 transition-colors disabled:opacity-50 ${
          checked
            ? "border-emerald-200 bg-emerald-50"
            : "border-stone-200 bg-stone-100"
        }`}
      >
        <span
          className={`relative h-6 w-11 rounded-full transition-colors ${
            checked ? "bg-emerald-500" : "bg-stone-300"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow-sm transition-transform ${
              checked ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </span>
        <span
          className={`min-w-[2.75rem] pr-2 text-xs font-semibold ${
            checked ? "text-emerald-800" : "text-stone-500"
          }`}
        >
          {checked ? onLabel : offLabel}
        </span>
      </button>
    </div>
  );
}
