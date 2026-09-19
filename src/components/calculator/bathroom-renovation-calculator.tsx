"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CostBreakdownChart } from "@/components/calculator/cost-breakdown-chart";
import { brand } from "@/lib/brand-theme";
import {
  calculateBathroomEstimate,
  defaultCalculatorLineItems,
  formatEuro,
  googlePriceSearch,
  newCustomLineItem,
  TILE_TIER_AMOUNTS,
  type CalculatorLineItem,
  type TileTier,
} from "@/lib/bathroom-calculator";

const CHART_COLORS = [
  "bg-stone-400",
  "bg-sky-500",
  "bg-sky-700",
  "bg-orange-400",
  "bg-orange-600",
  "bg-amber-500",
  "bg-violet-500",
  "bg-emerald-500",
];

export function BathroomRenovationCalculator() {
  const [floorSqm, setFloorSqm] = useState(5);
  const [tileTier, setTileTier] = useState<TileTier>("perus");
  const [items, setItems] = useState<CalculatorLineItem[]>(() =>
    defaultCalculatorLineItems("perus"),
  );

  const estimate = useMemo(
    () => calculateBathroomEstimate(floorSqm, items),
    [floorSqm, items],
  );

  const chartSegments = useMemo(
    () =>
      estimate.lines
        .filter((l) => l.enabled && l.amount > 0)
        .map((l, i) => ({
          label: l.label,
          amount: l.amount,
          color: CHART_COLORS[i % CHART_COLORS.length],
        })),
    [estimate.lines],
  );

  function updateItem(id: string, patch: Partial<CalculatorLineItem>) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  function applyTileTier(tier: TileTier) {
    setTileTier(tier);
    setItems((prev) =>
      prev.map((item) =>
        item.id === "laatat"
          ? { ...item, amount: TILE_TIER_AMOUNTS[tier] }
          : item,
      ),
    );
  }

  const wallEstimate = Math.round(floorSqm * 4);

  return (
    <div className="space-y-8">
      <section className={`${brand.section} p-5 sm:p-6`}>
        <h2 className="text-xl font-bold text-stone-900">Laske arvio</h2>
        <p className="mt-2 text-sm text-stone-600">
          Syötä kylpyhuoneen <strong>lattian neliömäärä</strong>. Seinäpinta-alan
          arvioidaan olevan noin 4-kertainen lattiaan nähden (~{wallEstimate} m²
          seinää {floorSqm} m² lattialla).
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-stone-700">
              Lattian pinta-ala (m²)
            </span>
            <input
              type="number"
              min={1}
              max={30}
              step={0.5}
              value={floorSqm}
              onChange={(e) => setFloorSqm(Number(e.target.value) || 1)}
              className={`mt-1 w-full rounded-xl border border-stone-200 px-3 py-2.5 text-lg font-semibold ${brand.input}`}
            />
          </label>

          <fieldset>
            <legend className="text-sm font-medium text-stone-700">
              Laatataso (materiaalit)
            </legend>
            <div className="mt-1 flex gap-2">
              {(["perus", "premium"] as const).map((tier) => (
                <button
                  key={tier}
                  type="button"
                  onClick={() => applyTileTier(tier)}
                  className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                    tileTier === tier
                      ? "border-sky-600 bg-sky-50 text-sky-900"
                      : "border-stone-200 bg-white text-stone-700 hover:border-sky-200"
                  }`}
                >
                  {tier === "perus" ? "Perustaso" : "Premium"}
                  <span className="mt-0.5 block text-xs font-normal text-stone-500">
                    {TILE_TIER_AMOUNTS[tier]} €/m²
                  </span>
                </button>
              ))}
            </div>
          </fieldset>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-bold text-stone-900">Kustannusrivit</h2>
          <button
            type="button"
            onClick={() => setItems((prev) => [...prev, newCustomLineItem()])}
            className={`${brand.btnSecondary} text-sm`}
          >
            + Lisää oma kulu
          </button>
        </div>
        <p className="text-sm text-stone-600">
          Muokkaa hintoja tarpeen mukaan. Voit tarkistaa markkinahintoja{" "}
          <span className="font-medium">Google-haun</span> kautta jokaisen rivin
          kohdalta.
        </p>

        <ul className="space-y-3">
          {items.map((item) => {
            const lineTotal = calculateBathroomEstimate(floorSqm, [item]).total;
            return (
              <li
                key={item.id}
                className={`rounded-2xl border p-4 transition ${
                  item.enabled
                    ? "border-stone-200 bg-white"
                    : "border-stone-100 bg-stone-50 opacity-60"
                }`}
              >
                <div className="flex flex-wrap items-start gap-3">
                  <input
                    type="checkbox"
                    checked={item.enabled}
                    onChange={(e) =>
                      updateItem(item.id, { enabled: e.target.checked })
                    }
                    className={`mt-1 ${brand.checkbox}`}
                    aria-label={`Sisällytä ${item.label}`}
                  />
                  <div className="min-w-0 flex-1">
                    {item.custom ? (
                      <input
                        type="text"
                        value={item.label}
                        onChange={(e) =>
                          updateItem(item.id, { label: e.target.value })
                        }
                        className={`mb-2 w-full rounded-lg border border-stone-200 px-2 py-1 text-sm font-semibold ${brand.input}`}
                      />
                    ) : (
                      <p className="font-semibold text-stone-900">{item.label}</p>
                    )}
                    {item.description && (
                      <p className="mt-0.5 text-xs text-stone-500">
                        {item.description}
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap items-end gap-3">
                      <label className="text-xs text-stone-600">
                        {item.unit === "per_sqm" ? "€ / lattia-m²" : "Kiinteä €"}
                        <input
                          type="number"
                          min={0}
                          step={item.unit === "per_sqm" ? 10 : 50}
                          value={item.amount}
                          onChange={(e) =>
                            updateItem(item.id, {
                              amount: Number(e.target.value) || 0,
                            })
                          }
                          className={`mt-0.5 block w-28 rounded-lg border border-stone-200 px-2 py-1.5 text-sm ${brand.input}`}
                        />
                      </label>
                      {item.minAmount != null && (
                        <label className="text-xs text-stone-600">
                          Minimi €
                          <input
                            type="number"
                            min={0}
                            step={100}
                            value={item.minAmount}
                            onChange={(e) =>
                              updateItem(item.id, {
                                minAmount: Number(e.target.value) || 0,
                              })
                            }
                            className={`mt-0.5 block w-28 rounded-lg border border-stone-200 px-2 py-1.5 text-sm ${brand.input}`}
                          />
                        </label>
                      )}
                      {item.custom && (
                        <label className="text-xs text-stone-600">
                          Tyyppi
                          <select
                            value={item.unit}
                            onChange={(e) =>
                              updateItem(item.id, {
                                unit: e.target.value as "per_sqm" | "fixed",
                              })
                            }
                            className={`mt-0.5 block rounded-lg border border-stone-200 px-2 py-1.5 text-sm ${brand.input}`}
                          >
                            <option value="fixed">Kiinteä summa</option>
                            <option value="per_sqm">€ / lattia-m²</option>
                          </select>
                        </label>
                      )}
                      {item.searchHint && (
                        <a
                          href={googlePriceSearch(item.searchHint)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium text-sky-700 hover:underline"
                        >
                          Hae hintoja Googlesta ↗
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-stone-900">
                      {formatEuro(lineTotal)}
                    </p>
                    {item.custom && (
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="mt-1 text-xs text-red-600 hover:underline"
                      >
                        Poista
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <CostBreakdownChart
          segments={chartSegments}
          title="Arviosi kustannusjako"
          subtitle={`${floorSqm} m² lattia · arvio yhteensä ${formatEuro(estimate.total)}`}
        />

        <div className={`${brand.estimateBox} flex flex-col justify-center p-6`}>
          <p className="text-sm font-medium uppercase tracking-wide text-sky-800">
            Hintahaarukka
          </p>
          <p className="mt-2 text-3xl font-bold text-sky-950">
            {formatEuro(Math.round(estimate.total * 0.9))} –{" "}
            {formatEuro(Math.round(estimate.total * 1.15))}
          </p>
          <p className="mt-2 text-sm text-sky-900/90">
            Keskiarvo-arvio: <strong>{formatEuro(estimate.total)}</strong> (ennen
            kotitalousvähennystä). Todellinen hinta riippuu kohteesta, alueesta ja
            materiaalivalinnoista.
          </p>
          <p className="mt-3 text-xs text-stone-600">
            Suomessa täysremontin neliöhinta on tyypillisesti 900–2 000 €/m²
            (lähde: toteutuneet urakat 2025–2026).
          </p>
        </div>
      </div>

      <aside className="rounded-2xl border-2 border-orange-200 bg-gradient-to-r from-orange-50 via-white to-sky-50 p-6">
        <h2 className="text-xl font-bold text-stone-900">
          Haluatko tarkan tarjouksen urakoitsijoilta?
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-stone-700">
          Laskuri antaa suuntaa-antavan arvion. Kilpailuta kylpyhuoneremontti
          ilmaiseksi — saat oikeat tarjoukset alueeltasi ja vertailet samassa
          muodossa. Tarjouspyyntö onnistuu ilman tiliä.
        </p>
        <div className={`${brand.actionsStack} mt-5`}>
          <Link
            href="/remontti/uusi?tyyppi=kylpyhuone"
            className={`${brand.btnPrimary} ${brand.btnPrimaryBlock}`}
          >
            Kilpailuta kylpyhuoneremontti ilmaiseksi
          </Link>
          <Link
            href="/hinta-arkisto?tyo=kylpyhuone"
            className={`${brand.btnSecondary} ${brand.btnSecondaryBlock}`}
          >
            Katso toteutuneet hinnat
          </Link>
        </div>
      </aside>
    </div>
  );
}
