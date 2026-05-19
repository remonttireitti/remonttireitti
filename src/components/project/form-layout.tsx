import type { ReactNode } from "react";
import { brand, formInputClass } from "@/lib/brand-theme";

export { formInputClass };

export function FormPage({
  intro,
  children,
}: {
  intro?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-6">
      {intro && (
        <p className="text-sm leading-relaxed text-stone-600">{intro}</p>
      )}
      {children}
    </div>
  );
}

export function FormGrid({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`grid grid-cols-1 items-stretch gap-5 lg:grid-cols-2 ${className}`}
    >
      {children}
    </div>
  );
}

export function FormSection({
  title,
  description,
  children,
  span = "half",
  className = "",
}: {
  title: string;
  description?: string;
  children: ReactNode;
  span?: "half" | "full";
  className?: string;
}) {
  const spanClass = span === "full" ? "lg:col-span-2" : "";

  return (
    <section
      className={`flex h-full min-h-0 flex-col ${brand.section} ${spanClass} ${className}`}
    >
      <header className={brand.sectionHeader}>
        <h3 className={brand.sectionTitle}>{title}</h3>
        {description && <p className={brand.sectionDesc}>{description}</p>}
      </header>
      <div className="flex flex-1 flex-col gap-4 p-5">{children}</div>
    </section>
  );
}

export function FieldGrid({
  children,
  cols = 2,
}: {
  children: ReactNode;
  cols?: 1 | 2 | 3;
}) {
  const colClass =
    cols === 3
      ? "sm:grid-cols-2 lg:grid-cols-3"
      : cols === 1
        ? "grid-cols-1"
        : "sm:grid-cols-2";
  return <div className={`grid gap-4 ${colClass}`}>{children}</div>;
}

export function FieldGroup({
  label,
  hint,
  children,
  className = "",
}: {
  label?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      {label && (
        <span className="block text-sm font-medium text-stone-700">{label}</span>
      )}
      {hint && (
        <span className="mt-0.5 block text-xs text-stone-500">{hint}</span>
      )}
      {children}
    </div>
  );
}

export function RadioCards({
  name,
  value,
  options,
  onChange,
  columns = 1,
}: {
  name?: string;
  value: string;
  options: { value: string; label: string; hint?: string }[];
  onChange: (value: string) => void;
  columns?: 1 | 2 | 3;
}) {
  const grid =
    columns === 3
      ? "sm:grid-cols-3"
      : columns === 2
        ? "sm:grid-cols-2"
        : "grid-cols-1";

  return (
    <div className={`grid gap-2 ${grid}`} role="radiogroup">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <label
            key={opt.value}
            className={`flex cursor-pointer flex-col rounded-lg border px-3 py-2.5 text-sm transition-colors ${
              active ? brand.selectedCard : brand.cardIdle
            }`}
          >
            <span className="flex items-start gap-2">
              <input
                type="radio"
                name={name}
                value={opt.value}
                checked={active}
                onChange={() => onChange(opt.value)}
                className={`mt-0.5 shrink-0 ${brand.checkbox}`}
              />
              <span className="font-medium text-stone-800">{opt.label}</span>
            </span>
            {opt.hint && (
              <span className="mt-1 pl-5 text-xs text-stone-500">{opt.hint}</span>
            )}
          </label>
        );
      })}
    </div>
  );
}

export function CheckboxGrid({
  options,
  selected,
  onToggle,
}: {
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((opt) => (
        <label
          key={opt.value}
          className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
            selected.includes(opt.value) ? brand.selectedCard : brand.cardIdle
          }`}
        >
          <input
            type="checkbox"
            checked={selected.includes(opt.value)}
            onChange={() => onToggle(opt.value)}
            className={brand.checkbox}
          />
          {opt.label}
        </label>
      ))}
    </div>
  );
}
