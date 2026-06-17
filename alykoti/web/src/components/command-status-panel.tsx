"use client";

import type { CommandRow } from "@/app/api/device/commands/route";
import { commandStatusLabel, commandSummary } from "@/hooks/use-command-status";

type Props = {
  commands: CommandRow[];
};

export function CommandStatusPanel({ commands }: Props) {
  if (commands.length === 0) return null;

  return (
    <section
      className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm"
      aria-live="polite"
    >
      <p className="font-semibold text-stone-900">Komennot</p>
      <ul className="mt-2 space-y-1.5">
        {commands.map((cmd) => (
          <li key={cmd.id} className="flex items-center justify-between gap-3">
            <span className="text-stone-700">{commandSummary(cmd)}</span>
            <StatusBadge status={cmd.status} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function StatusBadge({ status }: { status: string }) {
  const label = commandStatusLabel(status);
  const className =
    status === "acked"
      ? "bg-emerald-100 text-emerald-900"
      : status === "failed"
        ? "bg-red-100 text-red-900"
        : status === "delivered"
          ? "bg-sky-100 text-sky-900"
          : "bg-amber-100 text-amber-900";

  return (
    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}>
      {label}
    </span>
  );
}
