"use client";

import { brand } from "@/lib/brand-theme";
import {
  compareLineTotal,
  compareUnitPrice,
  LINE_PRICE_COMPARISON_LABELS,
  linePriceComparisonBadgeClass,
} from "@/lib/calculator-line-price-compare";
import {
  calculateEstimate,
  formatEuro,
  googlePriceSearch,
  lineItemTotal,
  newCustomLineItem,
} from "@/lib/calculators/math";
import type { CalculatorConfig, CalculatorLineItem } from "@/lib/calculators/types";
import { VatLabel } from "@/components/price/price-with-vat";
import type { VatTreatment } from "@/lib/vat-label";

function unitLabel(
  unit: CalculatorLineItem["unit"],
  primaryUnit: string,
  secondaryUnit?: string,
): string {
  if (unit === "fixed") return "Kiinteä €";
  if (unit === "per_secondary") return `€ / ${secondaryUnit ?? "yks."}`;
  return `€ / ${primaryUnit}`;
}

type Props = {
  config: CalculatorConfig;
  items: CalculatorLineItem[];
  adjustedItems: CalculatorLineItem[];
  primaryQty: number;
  secondaryQty: number;
  onUpdateItem: (id: string, patch: Partial<CalculatorLineItem>) => void;
  onRemoveItem?: (id: string) => void;
  onAddCustomItem?: () => void;
  vatTreatment: VatTreatment;
  fixedAdd?: number;
  title?: string;
  description?: string;
  showGoogleSearch?: boolean;
  allowCustomLines?: boolean;
  compact?: boolean;
  /** Näytä viitehinta ja vertailu (edullisempi / lähes sama / kalliimpi). */
  showReferenceComparison?: boolean;
};

export function CalculatorLineItemsEditor({
  config,
  items,
  adjustedItems,
  primaryQty,
  secondaryQty,
  onUpdateItem,
  onRemoveItem,
  onAddCustomItem,
  vatTreatment,
  fixedAdd = 0,
  title = "Kustannusrivit",
  description = "Valitse mukaan tulevat rivit ja muokkaa hintoja viitearvosta poikkeavaksi.",
  showGoogleSearch = true,
  allowCustomLines = true,
  compact = false,
  showReferenceComparison = false,
}: Props) {
  function handleAddCustom() {
    if (onAddCustomItem) {
      onAddCustomItem();
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3
            className={
              compact
                ? "text-sm font-semibold text-stone-900"
                : "text-xl font-bold text-stone-900"
            }
          >
            {title}
          </h3>
          <p className="mt-1 text-xs text-stone-600 sm:text-sm">{description}</p>
        </div>
        {allowCustomLines && onAddCustomItem && (
          <button
            type="button"
            onClick={handleAddCustom}
            className={`${brand.btnSecondary} shrink-0 text-sm`}
          >
            + Lisää oma kulu
          </button>
        )}
      </div>

      <ul className={compact ? "space-y-2" : "space-y-3"}>
        {items.map((item) => {
          const adjusted =
            adjustedItems.find((i) => i.id === item.id) ?? item;
          const lineTotal = calculateEstimate(primaryQty, secondaryQty, [
            adjusted,
          ]).total;
          const referenceUnit = item.referenceAmount;
          const referenceLineTotal =
            referenceUnit != null && referenceUnit > 0
              ? lineItemTotal(
                  { ...adjusted, amount: referenceUnit },
                  primaryQty,
                  secondaryQty,
                )
              : null;
          const unitComparison =
            showReferenceComparison && referenceUnit != null && referenceUnit > 0
              ? compareUnitPrice(item.amount, referenceUnit)
              : null;
          const totalComparison =
            showReferenceComparison && referenceLineTotal != null && referenceLineTotal > 0
              ? compareLineTotal(lineTotal, referenceLineTotal)
              : null;
          const comparison = unitComparison ?? totalComparison;

          return (
            <li
              key={item.id}
              className={`group rounded-xl border transition ${
                compact ? "p-3 sm:p-4" : "p-4"
              } ${
                adjusted.enabled
                  ? "border-stone-200 bg-white"
                  : "border-stone-100 bg-stone-50 opacity-70"
              }`}
            >
              <div className="flex flex-wrap items-start gap-3">
                <input
                  type="checkbox"
                  checked={adjusted.enabled}
                  onChange={(e) =>
                    onUpdateItem(item.id, { enabled: e.target.checked })
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
                        onUpdateItem(item.id, { label: e.target.value })
                      }
                      className={`mb-2 w-full rounded-lg border border-stone-200 px-2 py-1 text-sm font-semibold ${brand.input}`}
                    />
                  ) : (
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p
                        className={
                          compact
                            ? "font-medium text-stone-900"
                            : "font-semibold text-stone-900"
                        }
                      >
                        {item.label}
                      </p>
                      {compact && (
                        <span className="font-semibold tabular-nums text-stone-900">
                          {formatEuro(lineTotal)}
                          <VatLabel treatment={vatTreatment} />
                        </span>
                      )}
                    </div>
                  )}
                  {item.description && (
                    <p className="mt-0.5 text-xs text-stone-500">
                      {item.description}
                    </p>
                  )}

                  <div className="mt-2 flex flex-wrap items-end gap-3 sm:mt-3">
                    {showReferenceComparison &&
                      referenceUnit != null &&
                      referenceUnit > 0 &&
                      !item.custom && (
                        <div className="text-xs text-stone-600">
                          <span className="block font-medium text-stone-500">
                            Viite
                          </span>
                          <span className="mt-0.5 block tabular-nums text-stone-700">
                            {formatEuro(referenceUnit)}
                            {referenceLineTotal != null &&
                              referenceLineTotal !== referenceUnit && (
                                <span className="text-stone-500">
                                  {" "}
                                  → {formatEuro(referenceLineTotal)}
                                </span>
                              )}
                          </span>
                        </div>
                      )}
                    <label className="text-xs text-stone-600">
                      {unitLabel(
                        item.unit,
                        config.primaryInput.unit,
                        config.secondaryInput?.unit,
                      )}
                      <input
                        type="number"
                        min={0}
                        step={1}
                        inputMode="decimal"
                        value={item.amount}
                        onChange={(e) =>
                          onUpdateItem(item.id, {
                            amount: Number(e.target.value) || 0,
                          })
                        }
                        className={`mt-0.5 block w-28 rounded-lg border border-stone-200 px-2 py-1.5 text-sm tabular-nums ${brand.input}`}
                      />
                    </label>
                    {comparison && (
                      <span
                        className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${linePriceComparisonBadgeClass(comparison)}`}
                      >
                        {LINE_PRICE_COMPARISON_LABELS[comparison]}
                      </span>
                    )}
                    {item.minAmount != null && (
                      <label className="text-xs text-stone-600">
                        Minimi €
                        <input
                          type="number"
                          min={0}
                          step={1}
                          inputMode="decimal"
                          value={item.minAmount}
                          onChange={(e) =>
                            onUpdateItem(item.id, {
                              minAmount: Number(e.target.value) || 0,
                            })
                          }
                          className={`mt-0.5 block w-28 rounded-lg border border-stone-200 px-2 py-1.5 text-sm tabular-nums ${brand.input}`}
                        />
                      </label>
                    )}
                    {item.custom && (
                      <label className="text-xs text-stone-600">
                        Tyyppi
                        <select
                          value={item.unit}
                          onChange={(e) =>
                            onUpdateItem(item.id, {
                              unit: e.target.value as CalculatorLineItem["unit"],
                            })
                          }
                          className={`mt-0.5 block rounded-lg border border-stone-200 px-2 py-1.5 text-sm ${brand.input}`}
                        >
                          <option value="fixed">Kiinteä summa</option>
                          <option value="per_primary">
                            € / {config.primaryInput.unit}
                          </option>
                          {config.secondaryInput && (
                            <option value="per_secondary">
                              € / {config.secondaryInput.unit}
                            </option>
                          )}
                        </select>
                      </label>
                    )}
                    {showGoogleSearch && item.searchHint && (
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
                {!compact && (
                  <div className="text-right">
                    <p className="text-lg font-bold text-stone-900">
                      {formatEuro(lineTotal)}
                    </p>
                    <VatLabel treatment={vatTreatment} />
                    {item.custom && onRemoveItem && (
                      <button
                        type="button"
                        onClick={() => onRemoveItem(item.id)}
                        className="mt-1 text-xs text-red-600 hover:underline"
                      >
                        Poista
                      </button>
                    )}
                  </div>
                )}
                {compact && item.custom && onRemoveItem && (
                  <button
                    type="button"
                    onClick={() => onRemoveItem(item.id)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Poista
                  </button>
                )}
              </div>
            </li>
          );
        })}
        {fixedAdd > 0 && (
          <li className="flex justify-between rounded-xl border border-dashed border-stone-200 px-3 py-2 text-sm">
            <span>Lisäkulut (kysymykset)</span>
            <span className="font-semibold">
              {formatEuro(fixedAdd)}{" "}
              <VatLabel treatment={vatTreatment} inline />
            </span>
          </li>
        )}
      </ul>
    </section>
  );
}

export { newCustomLineItem };
