import type { ReactNode } from "react";

export type DetailRow = { label: string; value: string };

export function DetailSection({
  title,
  rows,
  children,
}: {
  title: string;
  rows?: DetailRow[];
  children?: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
      <h3 className="text-sm font-semibold text-stone-900">{title}</h3>
      {rows && rows.length > 0 && (
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          {rows.map((row) => (
            <DetailItem key={`${title}-${row.label}`} {...row} />
          ))}
        </dl>
      )}
      {children}
    </section>
  );
}

export function DetailItem({ label, value }: DetailRow) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-stone-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-stone-900">{value}</dd>
    </div>
  );
}

export function DetailSectionsGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-3 md:gap-4 lg:grid-cols-2">{children}</div>
  );
}
