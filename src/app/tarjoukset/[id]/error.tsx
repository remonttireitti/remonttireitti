"use client";

import Link from "next/link";
import { useEffect } from "react";
import { brand } from "@/lib/brand-theme";

export default function TarjouksetProjectError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[tarjoukset/project]", error);
  }, [error]);

  return (
    <div className={brand.page}>
      <main className={brand.mainForm}>
        <h1 className="text-2xl font-bold sm:text-3xl">Sivun lataus epäonnistui</h1>
        <p className="mt-3 max-w-xl text-stone-600">
          Tarjouspyynnön sivu ei auennut. Jos lähetit täydennyspyynnön, se on voinut
          silti mennä perille — kokeile päivittää sivu. Jos ongelma jatkuu, palaa
          pyyntölistalle ja avaa kohde uudelleen.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" onClick={reset} className={brand.btnPrimary}>
            Yritä uudelleen
          </button>
          <Link
            href="/tarjoukset"
            className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50"
          >
            ← Pyynnöt
          </Link>
        </div>
      </main>
    </div>
  );
}
