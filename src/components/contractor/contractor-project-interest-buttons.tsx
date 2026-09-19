"use client";

import { useActionState } from "react";
import {
  setContractorProjectInterest,
  type ContractorInterestActionState,
} from "@/app/actions/contractor-project-interest";
import type { ProjectInterest } from "@/lib/contractor-work-filter";

function ThumbsUpIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M7 10v12" />
      <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
    </svg>
  );
}

function ThumbsDownIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M17 14V2" />
      <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z" />
    </svg>
  );
}

export function ContractorProjectInterestButtons({
  projectId,
  currentInterest,
  compact = false,
  tone = "default",
}: {
  projectId: string;
  currentInterest: ProjectInterest | null;
  compact?: boolean;
  /** Use on colorful AdminGridCard backgrounds. */
  tone?: "default" | "onColor";
}) {
  const [state, action, pending] = useActionState<
    ContractorInterestActionState,
    FormData
  >(setContractorProjectInterest, {});

  const interestedActive = currentInterest === "interested";
  const notInterestedActive = currentInterest === "not_interested";

  function iconBtnClass(active: boolean, variant: "up" | "down") {
    const base = compact
      ? "inline-flex size-8 items-center justify-center rounded-lg disabled:opacity-60"
      : "inline-flex size-9 items-center justify-center rounded-lg disabled:opacity-60";

    if (tone === "onColor") {
      if (active && variant === "up") {
        return `${base} bg-white text-emerald-800 shadow-sm`;
      }
      if (active && variant === "down") {
        return `${base} bg-white text-stone-800 shadow-sm`;
      }
      return `${base} border border-white/45 bg-white/15 text-white hover:bg-white/25`;
    }

    if (active && variant === "up") {
      return `${base} bg-emerald-700 text-white shadow-sm`;
    }
    if (active && variant === "down") {
      return `${base} bg-stone-600 text-white shadow-sm`;
    }
    return `${base} border border-stone-300 bg-white text-stone-600 hover:bg-stone-50`;
  }

  const iconSize = compact ? "size-4" : "size-[1.125rem]";

  return (
    <div
      className={compact ? "flex flex-wrap items-center gap-1.5" : "space-y-2"}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      role="group"
      aria-label="Merkitse kiinnostus"
    >
      <div className="flex items-center gap-1.5">
        <form action={action}>
          <input type="hidden" name="project_id" value={projectId} />
          <input
            type="hidden"
            name="interest"
            value={interestedActive ? "clear" : "interested"}
          />
          <button
            type="submit"
            disabled={pending}
            className={iconBtnClass(interestedActive, "up")}
            aria-pressed={interestedActive}
            aria-label={
              interestedActive
                ? "Poista kiinnostusmerkintä"
                : "Merkitse: kiinnostaa"
            }
            title={interestedActive ? "Poista merkintä" : "Kiinnostaa"}
          >
            <ThumbsUpIcon className={iconSize} />
          </button>
        </form>
        <form action={action}>
          <input type="hidden" name="project_id" value={projectId} />
          <input
            type="hidden"
            name="interest"
            value={notInterestedActive ? "clear" : "not_interested"}
          />
          <button
            type="submit"
            disabled={pending}
            className={iconBtnClass(notInterestedActive, "down")}
            aria-pressed={notInterestedActive}
            aria-label={
              notInterestedActive
                ? "Poista ei-kiinnosta-merkintä"
                : "Merkitse: ei kiinnosta"
            }
            title={notInterestedActive ? "Poista merkintä" : "Ei kiinnosta"}
          >
            <ThumbsDownIcon className={iconSize} />
          </button>
        </form>
      </div>
      {state.ok && (
        <p
          className={`text-xs ${tone === "onColor" ? "text-white/90" : "text-emerald-800"}`}
          role="status"
        >
          {state.ok}
        </p>
      )}
      {state.error && (
        <p
          className={`text-xs ${tone === "onColor" ? "text-amber-100" : "text-red-600"}`}
          role="alert"
        >
          {state.error}
        </p>
      )}
    </div>
  );
}
