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
}: {
  href: string;
  id: string;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`group flex min-h-[9.5rem] flex-col rounded-xl p-4 text-white shadow-md transition ${adminGridCardColor(id)}`}
    >
      <p className="text-base font-bold leading-snug">{title}</p>
      <div className="mt-2 flex-1 space-y-1 text-sm leading-relaxed text-white/90">
        {children}
      </div>
      {footer && (
        <div className="mt-3 border-t border-white/20 pt-2 text-xs text-white/85">
          {footer}
        </div>
      )}
    </Link>
  );
}
