import {
  buildPropertyDetailLines,
  type PropertyProfile,
} from "@/lib/property-profile";

export function PropertyDetailsDisplay({
  property,
}: {
  property: Pick<
    PropertyProfile,
    "property_type" | "built_year" | "floor_area_m2" | "notes" | "details"
  >;
}) {
  const lines = buildPropertyDetailLines(property);
  if (lines.length === 0) return null;

  return (
    <dl className="mt-4 grid gap-3 sm:grid-cols-2">
      {lines.map((line) => (
        <div key={line.label} className="rounded-lg bg-stone-50 px-3 py-2.5">
          <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            {line.label}
          </dt>
          <dd className="mt-0.5 text-sm leading-relaxed text-stone-800">
            {line.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
