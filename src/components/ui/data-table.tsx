import type { ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";

/**
 * Shared compact list/table shell used by admin listings and contractor
 * dashboard lists. Horizontal scroll on narrow viewports; dense rows on desktop.
 */
export function DataTable({
  children,
  minWidthClassName = "min-w-[640px]",
  className = "",
}: {
  children: ReactNode;
  minWidthClassName?: string;
  className?: string;
}) {
  return (
    <div
      className={`overflow-x-auto rounded-xl border border-stone-200 bg-white ${className}`.trim()}
    >
      <table className={`w-full ${minWidthClassName} text-sm`}>{children}</table>
    </div>
  );
}

export function DataTableHeader({ children }: { children: ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-stone-200 bg-stone-50 text-left text-xs font-semibold uppercase tracking-wide text-stone-600">
        {children}
      </tr>
    </thead>
  );
}

export function DataTableTh({
  children,
  className = "",
  ...props
}: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th className={`px-3 py-2.5 sm:px-4 sm:py-3 ${className}`.trim()} {...props}>
      {children}
    </th>
  );
}

export function DataTableBody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function DataTableRow({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <tr
      className={`border-b border-stone-100 align-middle last:border-0 hover:bg-stone-50/70 ${className}`.trim()}
    >
      {children}
    </tr>
  );
}

export function DataTableTd({
  children,
  className = "",
  ...props
}: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={`px-3 py-2.5 sm:px-4 sm:py-3 ${className}`.trim()} {...props}>
      {children}
    </td>
  );
}

export function DataTableEmptyRow({
  colSpan,
  children,
}: {
  colSpan: number;
  children: ReactNode;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-8 text-center text-stone-500">
        {children}
      </td>
    </tr>
  );
}
