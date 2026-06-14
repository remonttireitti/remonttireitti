"use client";

import { useMemo, useState } from "react";
import {
  HEAT_PUMP_BRAND_OPTIONS,
  lookupHeatPumpErrorCode,
  normalizeErrorCode,
  type HeatPumpBrandSlug,
} from "@/lib/heat-pump-error-codes";
import { formInputClass } from "@/lib/brand-theme";

export function HeatPumpErrorCodeLookup({
  onMatch,
}: {
  onMatch: (match: {
    code: string;
    brand: HeatPumpBrandSlug;
    title: string;
    meaning: string;
    safeAction: string;
    callPro: boolean;
  } | null) => void;
}) {
  const [brand, setBrand] = useState<HeatPumpBrandSlug>("muu");
  const [code, setCode] = useState("");

  const match = useMemo(() => {
    const normalized = normalizeErrorCode(code);
    if (!normalized) return null;
    const entry = lookupHeatPumpErrorCode(normalized, brand);
    if (!entry) return null;
    return {
      code: normalized,
      brand,
      title: entry.title,
      meaning: entry.meaning,
      safeAction: entry.safeAction,
      callPro: entry.callPro,
    };
  }, [brand, code]);

  function handleCodeChange(value: string) {
    setCode(value);
    const normalized = normalizeErrorCode(value);
    if (!normalized) {
      onMatch(null);
      return;
    }
    const entry = lookupHeatPumpErrorCode(normalized, brand);
    onMatch(
      entry
        ? {
            code: normalized,
            brand,
            title: entry.title,
            meaning: entry.meaning,
            safeAction: entry.safeAction,
            callPro: entry.callPro,
          }
        : null,
    );
  }

  function handleBrandChange(value: HeatPumpBrandSlug) {
    setBrand(value);
    const normalized = normalizeErrorCode(code);
    if (!normalized) {
      onMatch(null);
      return;
    }
    const entry = lookupHeatPumpErrorCode(normalized, value);
    onMatch(
      entry
        ? {
            code: normalized,
            brand: value,
            title: entry.title,
            meaning: entry.meaning,
            safeAction: entry.safeAction,
            callPro: entry.callPro,
          }
        : null,
    );
  }

  return (
    <section className="rounded-2xl border border-sky-200 bg-sky-50/60 p-4 sm:p-5">
      <h2 className="text-lg font-semibold text-stone-900">Virhekoodihaku</h2>
      <p className="mt-1 text-sm text-stone-600">
        Valitse valmistaja ja kirjoita näytöllä näkyvä koodi (esim. E09, U4, A5).
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="error-brand" className="block text-sm font-medium text-stone-800">
            Valmistaja
          </label>
          <select
            id="error-brand"
            value={brand}
            onChange={(e) => handleBrandChange(e.target.value as HeatPumpBrandSlug)}
            className={formInputClass}
          >
            {HEAT_PUMP_BRAND_OPTIONS.map((b) => (
              <option key={b.slug} value={b.slug}>
                {b.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="error-code" className="block text-sm font-medium text-stone-800">
            Virhekoodi
          </label>
          <input
            id="error-code"
            type="text"
            value={code}
            onChange={(e) => handleCodeChange(e.target.value)}
            placeholder="Esim. E09"
            className={formInputClass}
          />
        </div>
      </div>

      {match ? (
        <div className="mt-4 rounded-xl border border-white bg-white p-4">
          <p className="font-semibold text-stone-900">
            {match.code}: {match.title}
          </p>
          <p className="mt-2 text-sm text-stone-700">{match.meaning}</p>
          <p className="mt-2 text-sm text-stone-600">
            <span className="font-medium">Voit kokeilla:</span> {match.safeAction}
          </p>
          {match.callPro && (
            <p className="mt-2 text-sm font-medium text-amber-900">
              Suositus: tilaa huolto, jos koodi palaa tai laite ei toimi.
            </p>
          )}
        </div>
      ) : normalizeErrorCode(code) ? (
        <p className="mt-3 text-sm text-stone-600">
          Koodia ei löydy tietokannasta — kirjaa se silti huoltopyyntöön. Tarkista myös
          käyttöohje.
        </p>
      ) : null}
    </section>
  );
}
