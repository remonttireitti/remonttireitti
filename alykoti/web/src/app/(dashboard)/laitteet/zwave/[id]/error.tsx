"use client";

import Link from "next/link";
import { useEffect } from "react";
import { LAITTEET } from "@/lib/laitteet-paths";

export default function ZwaveDeviceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Z-Wave device page error", error);
  }, [error]);

  return (
    <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-900">
      <p className="font-semibold">Laitesivu ei auennut</p>
      <p className="mt-2 text-red-800">
        {error.message || "Odottamaton virhe. Kokeile päivittää sivu."}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800"
        >
          Yritä uudelleen
        </button>
        <Link
          href={LAITTEET.zwave}
          className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-900 hover:bg-red-100"
        >
          ← Z-Wave-listaan
        </Link>
      </div>
    </div>
  );
}
