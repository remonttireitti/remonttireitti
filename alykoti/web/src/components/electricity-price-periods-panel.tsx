"use client";

import { useState, useTransition } from "react";
import {
  deleteElectricityPricePeriod,
  saveElectricityPricePeriod,
  type PeriodActionState,
} from "@/app/actions/electricity-periods";
import {
  periodModeLabel,
  periodSummary,
  type ElectricityPricePeriod,
} from "@/lib/electricity-price-periods";

type Props = {
  periods: ElectricityPricePeriod[];
};

const EMPTY = {
  id: "",
  name: "",
  mode: "cheapest_slots" as "cheapest_slots" | "below_cents",
  cheapest_slots: 8,
  below_cents: 5,
};

export function ElectricityPricePeriodsPanel({ periods }: Props) {
  const [flash, setFlash] = useState<PeriodActionState | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<PeriodActionState>) {
    startTransition(async () => {
      const result = await action();
      setFlash(result);
      if (result.ok) setForm(EMPTY);
    });
  }

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-stone-900">Halvimmat jaksot</h2>
      <p className="mt-1 text-sm text-stone-600">
        Määritä milloin sähkö on halvinta — näitä voi käyttää automaation laukaisimena.
      </p>

      {flash?.ok && (
        <div className="mt-3 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-900">
          {flash.ok}
        </div>
      )}
      {flash?.error && (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          {flash.error}
        </div>
      )}

      {periods.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {periods.map((period) => (
            <li
              key={period.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-stone-100 bg-stone-50 px-3 py-2 text-sm"
            >
              <div>
                <p className="font-medium text-stone-900">{period.name}</p>
                <p className="text-xs text-stone-500">
                  {periodModeLabel(period.mode)} · {periodSummary(period)}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      id: period.id,
                      name: period.name,
                      mode: period.mode,
                      cheapest_slots: period.cheapest_slots ?? 8,
                      below_cents: period.below_cents ?? 5,
                    })
                  }
                  className="rounded-lg border border-stone-200 px-2.5 py-1 text-xs font-medium"
                >
                  Muokkaa
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    if (window.confirm(`Poistetaanko "${period.name}"?`)) {
                      run(() => deleteElectricityPricePeriod(period.id));
                    }
                  }}
                  className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-800"
                >
                  Poista
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-stone-500">Ei jaksoja vielä.</p>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="text-sm font-medium text-stone-700">Nimi</span>
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Esim. Yöhalpa"
            className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-stone-700">Tyyppi</span>
          <select
            value={form.mode}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                mode: e.target.value as "cheapest_slots" | "below_cents",
              }))
            }
            className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
          >
            <option value="cheapest_slots">Halvimmat 15 min jaksot</option>
            <option value="below_cents">Alle hintarajan</option>
          </select>
        </label>
        {form.mode === "cheapest_slots" ? (
          <label className="block">
            <span className="text-sm font-medium text-stone-700">Jaksoja (15 min)</span>
            <input
              type="number"
              min={1}
              max={96}
              value={form.cheapest_slots}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  cheapest_slots: Number.parseInt(e.target.value, 10) || 8,
                }))
              }
              className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-stone-500">
              Esim. 8 jaksoa = 2 h halvinta sähköä päivässä
            </p>
          </label>
        ) : (
          <label className="block">
            <span className="text-sm font-medium text-stone-700">Raja c/kWh</span>
            <input
              type="number"
              min={0}
              step={0.1}
              value={form.below_cents}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  below_cents: Number.parseFloat(e.target.value) || 5,
                }))
              }
              className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
            />
          </label>
        )}
      </div>

      <button
        type="button"
        disabled={pending || !form.name.trim()}
        onClick={() =>
          run(() =>
            saveElectricityPricePeriod({
              id: form.id || undefined,
              name: form.name,
              mode: form.mode,
              cheapest_slots: form.cheapest_slots,
              below_cents: form.below_cents,
            }),
          )
        }
        className="mt-4 rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-50"
      >
        {pending ? "Tallennetaan…" : form.id ? "Tallenna muutokset" : "Lisää jakso"}
      </button>
    </section>
  );
}
