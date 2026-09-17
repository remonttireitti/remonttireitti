import Link from "next/link";
import {
  QUOTE_REQUEST_NO_ACCOUNT_BODY,
  QUOTE_REQUEST_NO_ACCOUNT_SHORT,
} from "@/lib/quote-request-copy";

type Props = {
  /** strip = heti logon alle, hero = laatikko, compact = yksirivinen */
  variant?: "strip" | "hero" | "compact";
  className?: string;
};

/** Korostaa että tarjouspyyntö onnistuu ilman tiliä. */
export function GuestQuoteRequestCallout({
  variant = "hero",
  className = "",
}: Props) {
  if (variant === "strip") {
    return (
      <aside
        className={`mb-5 rounded-2xl border-2 border-sky-300 bg-gradient-to-r from-sky-100 via-white to-emerald-50/90 px-4 py-4 shadow-md ring-1 ring-sky-200/80 sm:px-6 sm:py-5 ${className}`}
      >
        <p className="text-lg font-bold tracking-tight text-sky-950 sm:text-xl">
          Ei tiliä, ei rekisteröitymistä — aloita heti
        </p>
        <p className="mt-2 text-sm leading-relaxed text-stone-700 sm:text-base">
          Täytät tarjouspyynnön ja vahvistat sähköpostilinkistä. Urakoitsijat
          näkevät pyynnön vasta vahvistuksen jälkeen — tili on valinnainen
          myöhemmin.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/remontti/uusi"
            className="inline-flex items-center justify-center rounded-xl bg-sky-800 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-900"
          >
            Jätä tarjouspyyntö nyt
          </Link>
          <p className="text-xs text-stone-500 sm:max-w-[14rem] sm:text-right">
            Pieni apu vaatii kirjautumisen — eri palvelu.
          </p>
        </div>
      </aside>
    );
  }

  if (variant === "compact") {
    return (
      <p className={`text-sm text-stone-600 ${className}`}>
        <span className="font-semibold text-sky-900">
          {QUOTE_REQUEST_NO_ACCOUNT_SHORT}
        </span>{" "}
        <Link href="/remontti/uusi" className="font-medium text-sky-700 hover:underline">
          Aloita pyyntö →
        </Link>
      </p>
    );
  }

  return (
    <aside
      className={`rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50/90 via-white to-emerald-50/40 p-5 sm:p-6 ${className}`}
    >
      <p className="text-sm font-semibold uppercase tracking-wide text-sky-800">
        Ei tiliä tarvita
      </p>
      <p className="mt-2 text-sm leading-relaxed text-stone-700 sm:text-base">
        {QUOTE_REQUEST_NO_ACCOUNT_BODY}
      </p>
      <Link
        href="/remontti/uusi"
        className="mt-4 inline-block text-sm font-semibold text-sky-800 hover:underline"
      >
        Jätä tarjouspyyntö nyt →
      </Link>
    </aside>
  );
}
