"use client";

import { useActionState } from "react";
import {
  setLearnedProposalStatus,
  type AdminLearningState,
} from "@/app/actions/admin-learning";
import type { AdminLearnedProposalRow } from "@/lib/learned-proposals-admin";
import { LEARNED_ADDON_HINT_MIN, LEARNED_ADDON_STRONG_MIN } from "@/lib/learned-proposals";
import { brand } from "@/lib/brand-theme";

const kindLabels = {
  addon: "Lisätyö",
  info_need: "Puuttuva tieto",
} as const;

const statusLabels = {
  pending: "Odottaa",
  approved: "Hyväksytty",
  dismissed: "Hylätty",
} as const;

function StatusBadge({ status }: { status: AdminLearnedProposalRow["adminStatus"] }) {
  const cls =
    status === "approved"
      ? "bg-emerald-100 text-emerald-900"
      : status === "dismissed"
        ? "bg-stone-200 text-stone-700"
        : "bg-amber-100 text-amber-900";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {statusLabels[status]}
    </span>
  );
}

function ProposalActions({ row }: { row: AdminLearnedProposalRow }) {
  const [state, action, pending] = useActionState<
    AdminLearningState,
    FormData
  >(setLearnedProposalStatus, {});

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="job_slug" value={row.jobSlug} />
      <input type="hidden" name="kind" value={row.kind} />
      <input type="hidden" name="proposal_slug" value={row.slug} />
      {row.adminStatus !== "approved" && (
        <button
          type="submit"
          name="status"
          value="approved"
          disabled={pending}
          className="rounded-lg bg-emerald-700 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
        >
          Hyväksy
        </button>
      )}
      {row.adminStatus !== "dismissed" && (
        <button
          type="submit"
          name="status"
          value="dismissed"
          disabled={pending}
          className="rounded-lg border border-stone-300 bg-white px-2.5 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-60"
        >
          Hylkää
        </button>
      )}
      {row.adminStatus !== "pending" && (
        <button
          type="submit"
          name="status"
          value="pending"
          disabled={pending}
          className="rounded-lg border border-stone-300 bg-white px-2.5 py-1 text-xs font-medium text-stone-600 hover:bg-stone-50 disabled:opacity-60"
        >
          Palauta odottavaksi
        </button>
      )}
      {state.error && (
        <span className="text-xs text-red-600">{state.error}</span>
      )}
    </form>
  );
}

export function LearnedProposalsAdminPanel({
  proposals,
}: {
  proposals: AdminLearnedProposalRow[];
}) {
  if (proposals.length === 0) {
    return (
      <p className="rounded-xl border border-stone-200 bg-white p-6 text-sm text-stone-600">
        Ei vielä kerättyjä ehdotuksia. Urakoitsijat voivat ehdottaa puuttuvia
        rivejä ja tietoja tarjouslaskurissa.
      </p>
    );
  }

  const grouped = proposals.reduce(
    (acc, row) => {
      const list = acc.get(row.jobSlug) ?? [];
      list.push(row);
      acc.set(row.jobSlug, list);
      return acc;
    },
    new Map<string, AdminLearnedProposalRow[]>(),
  );

  return (
    <div className="space-y-8">
      {[...grouped.entries()]
        .sort(([a], [b]) => a.localeCompare(b, "fi"))
        .map(([jobSlug, rows]) => (
          <section key={jobSlug} className={`${brand.section} overflow-hidden`}>
            <div className="border-b border-stone-100 bg-stone-50/80 px-4 py-3 sm:px-5">
              <h2 className="font-semibold text-stone-900">{jobSlug}</h2>
              <p className="text-xs text-stone-500">
                {rows.length} ehdotusta · automaattinen vihje ≥{LEARNED_ADDON_HINT_MIN}{" "}
                · vahva ≥{LEARNED_ADDON_STRONG_MIN}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-100 text-left text-xs uppercase tracking-wide text-stone-500">
                    <th className="px-4 py-3 font-medium">Ehdotus</th>
                    <th className="px-4 py-3 font-medium">Tyyppi</th>
                    <th className="px-4 py-3 font-medium">Laskuri</th>
                    <th className="px-4 py-3 font-medium">Tila</th>
                    <th className="px-4 py-3 font-medium">Toiminnot</th>
                  </tr>
                </thead>
                <tbody>
                  {rows
                    .sort((a, b) => b.requestCount - a.requestCount)
                    .map((row) => (
                      <tr
                        key={`${row.kind}-${row.slug}`}
                        className="border-b border-stone-50 align-top"
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium text-stone-900">{row.label}</p>
                          {row.adminNote && (
                            <p className="mt-1 text-xs text-stone-500">
                              {row.adminNote}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-stone-600">
                          {kindLabels[row.kind]}
                        </td>
                        <td className="px-4 py-3 tabular-nums text-stone-700">
                          {row.requestCount}×
                          {row.suggestionCount > 0 && (
                            <span className="text-stone-500">
                              {" "}
                              · {row.suggestionCount} ehdotusta
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={row.adminStatus} />
                          {row.requestCount >= LEARNED_ADDON_STRONG_MIN &&
                            row.adminStatus === "pending" && (
                              <p className="mt-1 text-xs text-amber-800">
                                Suositeltu hyväksyttäväksi
                              </p>
                            )}
                        </td>
                        <td className="px-4 py-3">
                          <ProposalActions row={row} />
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
    </div>
  );
}
