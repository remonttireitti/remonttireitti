"use client";

import { useActionState, useMemo, useState } from "react";
import { remindContractorsAboutProject } from "@/app/actions/admin-projects";
import type { AdminState } from "@/app/actions/admin";
import type { AdminEligibleContractor } from "@/lib/admin-projects-server";

export function AdminContractorReminderPanel({
  projectId,
  contractors,
  canRemind,
}: {
  projectId: string;
  contractors: AdminEligibleContractor[];
  canRemind: boolean;
}) {
  const [state, action, pending] = useActionState<AdminState, FormData>(
    remindContractorsAboutProject,
    {},
  );

  const remindable = useMemo(
    () => contractors.filter((c) => !c.hasActiveBid),
    [contractors],
  );

  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllRemindable() {
    setSelected(new Set(remindable.map((c) => c.id)));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  if (!canRemind) return null;

  return (
    <section className="mt-6 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
      <h2 className="font-semibold text-amber-950">Muistuta urakoitsijoita</h2>
      <p className="mt-1 text-sm text-amber-900">
        Valitse urakoitsijat, joilla on sama lämpöpumppu profiilissaan mutta ei vielä
        tarjousta tähän pyyntöön. He saavat ilmoituksen ja sähköpostin (jos käytössä).
      </p>

      {contractors.length === 0 ? (
        <p className="mt-3 text-sm text-amber-800">
          Ei urakoitsijoita, joilla on valittu tämän pyynnön työlaji profiilissa.
        </p>
      ) : (
        <form action={action} className="mt-4">
          <input type="hidden" name="project_id" value={projectId} />

          <div className="mb-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={selectAllRemindable}
              disabled={pending || remindable.length === 0}
              className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-50 disabled:opacity-50"
            >
              Valitse kaikki ({remindable.length})
            </button>
            <button
              type="button"
              onClick={clearSelection}
              disabled={pending || selected.size === 0}
              className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50 disabled:opacity-50"
            >
              Tyhjennä valinta
            </button>
          </div>

          <ul className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-amber-100 bg-white p-2">
            {contractors.map((c) => {
              const label = c.company_name ?? c.email ?? c.id;
              const disabled = c.hasActiveBid || pending;
              const checked = selected.has(c.id);
              return (
                <li key={c.id}>
                  <label
                    className={`flex cursor-pointer items-start gap-2 rounded-lg px-2 py-2 text-sm ${
                      disabled && c.hasActiveBid
                        ? "cursor-not-allowed opacity-60"
                        : "hover:bg-amber-50/80"
                    }`}
                  >
                    <input
                      type="checkbox"
                      name="contractor_id"
                      value={c.id}
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggle(c.id)}
                      className="mt-0.5"
                    />
                    <span>
                      <span className="font-medium text-stone-900">{label}</span>
                      {c.email && c.company_name && (
                        <span className="block text-xs text-stone-500">
                          {c.email}
                        </span>
                      )}
                      {c.hasActiveBid && (
                        <span className="block text-xs text-stone-500">
                          Tarjous jo lähetetty
                        </span>
                      )}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>

          {state.error && (
            <p className="mt-3 text-sm text-red-700" role="alert">
              {state.error}
            </p>
          )}
          {state.ok && (
            <p className="mt-3 text-sm text-emerald-800" role="status">
              {state.ok}
            </p>
          )}

          <button
            type="submit"
            disabled={pending || selected.size === 0}
            className="mt-4 rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-60"
          >
            {pending
              ? "Lähetetään…"
              : `Lähetä muistutus (${selected.size})`}
          </button>
        </form>
      )}
    </section>
  );
}
