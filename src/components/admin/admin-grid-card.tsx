import Link from "next/link";
import type { ReactNode } from "react";

const CARD_COLORS = [
  "bg-sky-600 hover:bg-sky-700",
  "bg-emerald-600 hover:bg-emerald-700",
  "bg-teal-600 hover:bg-teal-700",
  "bg-violet-600 hover:bg-violet-700",
  "bg-orange-600 hover:bg-orange-700",
  "bg-rose-600 hover:bg-rose-700",
];

/**
 * Dense responsive grid for colorful admin-style list tiles.
 * Mobile stays readable (1–2 cols); md+ packs more columns.
 */
export const adminGridClassName =
  "grid gap-2.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6";

export function adminGridCardColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash + id.charCodeAt(i)) | 0;
  }
  return CARD_COLORS[Math.abs(hash) % CARD_COLORS.length]!;
}

export function AdminGridCard({
  href,
  id,
  title,
  children,
  footer,
  actions,
  className = "",
}: {
  href: string;
  id: string;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Extra controls outside the main link (e.g. interest buttons). */
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`group flex min-h-[7.25rem] flex-col rounded-xl text-white shadow-md transition md:min-h-[6.75rem] ${adminGridCardColor(id)} ${className}`.trim()}
    >
      <Link
        href={href}
        className="flex flex-1 flex-col p-3 md:p-2.5"
      >
        <p className="text-sm font-bold leading-snug md:text-[0.8125rem]">
          {title}
        </p>
        <div className="mt-1.5 flex-1 space-y-0.5 text-xs leading-snug text-white/90 md:mt-1">
          {children}
        </div>
        {footer && (
          <div className="mt-2 border-t border-white/20 pt-1.5 text-[0.6875rem] leading-snug text-white/85 md:mt-1.5">
            {footer}
          </div>
        )}
      </Link>
      {actions && (
        <div className="border-t border-white/20 px-3 pb-3 pt-2 md:px-2.5 md:pb-2.5 md:pt-1.5">
          {actions}
        </div>
      )}
    </div>
  );
}
