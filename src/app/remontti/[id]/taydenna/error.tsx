"use client";

import Link from "next/link";
import { useEffect } from "react";
import { brand } from "@/lib/brand-theme";

export default function TaydennaError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[taydenna]", error);
  }, [error]);

  return (
    <div className={brand.page}>
      <main className={brand.mainForm}>
        <h1 className="text-2xl font-bold sm:text-3xl">Täydennyslinkki ei auennut</h1>
        <p className="mt-3 max-w-xl text-stone-600">
          Sivun lataus epäonnistui. Kokeile avata linkki uudelleen suoraan
          sähköpostista. Jos ongelma jatkuu, pyydä urakoitsijaa lähettämään
          täydennyspyyntö uudelleen.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" onClick={reset} className={brand.btnPrimary}>
            Yritä uudelleen
          </button>
          <Link
            href="/kirjaudu"
            className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50"
          >
            Kirjaudu sisään
          </Link>
        </div>
      </main>
    </div>
  );
}
