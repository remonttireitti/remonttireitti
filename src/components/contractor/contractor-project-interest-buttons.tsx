"use client";

import { useActionState } from "react";
import {
  setContractorProjectInterest,
  type ContractorInterestActionState,
} from "@/app/actions/contractor-project-interest";
import type { ProjectInterest } from "@/lib/contractor-work-filter";

export function ContractorProjectInterestButtons({
  projectId,
  currentInterest,
  compact = false,
}: {
  projectId: string;
  currentInterest: ProjectInterest | null;
  compact?: boolean;
}) {
  const [state, action, pending] = useActionState<
    ContractorInterestActionState,
    FormData
  >(setContractorProjectInterest, {});

  function btnClass(active: boolean, variant: "green" | "gray") {
    const base = compact
      ? "rounded-lg px-2.5 py-1 text-xs font-medium disabled:opacity-60"
      : "rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-60";
    if (active && variant === "green") {
      return `${base} bg-emerald-700 text-white`;
    }
    if (active && variant === "gray") {
      return `${base} bg-stone-600 text-white`;
    }
    return `${base} border border-stone-300 bg-white text-stone-700 hover:bg-stone-50`;
  }

  return (
    <div
      className={compact ? "flex flex-wrap items-center gap-1.5" : "space-y-2"}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      role="group"
      aria-label="Merkitse kiinnostus"
    >
      <div className="flex flex-wrap gap-1.5">
        <form action={action}>
          <input type="hidden" name="project_id" value={projectId} />
          <input type="hidden" name="interest" value="interested" />
          <button
            type="submit"
            disabled={pending}
            className={btnClass(currentInterest === "interested", "green")}
          >
            Kiinnostaa
          </button>
        </form>
        <form action={action}>
          <input type="hidden" name="project_id" value={projectId} />
          <input type="hidden" name="interest" value="not_interested" />
          <button
            type="submit"
            disabled={pending}
            className={btnClass(currentInterest === "not_interested", "gray")}
          >
            Ei kiinnosta
          </button>
        </form>
        {currentInterest && (
          <form action={action}>
            <input type="hidden" name="project_id" value={projectId} />
            <input type="hidden" name="interest" value="clear" />
            <button
              type="submit"
              disabled={pending}
              className={btnClass(false, "green")}
            >
              Peru merkintä
            </button>
          </form>
        )}
      </div>
      {state.ok && (
        <p className="text-xs text-emerald-800" role="status">
          {state.ok}
        </p>
      )}
      {state.error && (
        <p className="text-xs text-red-600" role="alert">
          {state.error}
        </p>
      )}
    </div>
  );
}
