"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "remonttireitti-cookie-consent";

export type CookieConsent = "essential" | "all";

export function getStoredConsent(): CookieConsent | null {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem(STORAGE_KEY);
  if (v === "essential" || v === "all") return v;
  return null;
}

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!getStoredConsent()) setVisible(true);
  }, []);

  const save = useCallback((value: CookieConsent) => {
    localStorage.setItem(STORAGE_KEY, value);
    setVisible(false);
    window.dispatchEvent(new CustomEvent("cookie-consent-changed", { detail: value }));
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 border-t border-stone-200 bg-white p-4 shadow-lg sm:p-6"
      role="dialog"
      aria-label="Evästeilmoitus"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="text-sm text-stone-700">
          <p className="font-semibold text-stone-900">Evästeet</p>
          <p className="mt-1">
            Käytämme välttämättömiä evästeitä palvelun toimintaan. Keräämme myös
            anonyymiä kävijätilastoa (sivulataukset, ei henkilötietoja) palvelun
            kehittämiseksi — rekisteröitymistä ei vaadita. Voit hyväksyä
            lisäksi analytiikan palvelun kehittämiseksi.{" "}
            <Link href="/tietosuoja#evasteet" className="text-sky-700 hover:underline">
              Lue lisää
            </Link>
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={() => save("essential")}
            className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            Vain välttämättömät
          </button>
          <button
            type="button"
            onClick={() => save("all")}
            className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-800"
          >
            Hyväksy kaikki
          </button>
        </div>
      </div>
    </div>
  );
}
