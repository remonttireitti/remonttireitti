import Link from "next/link";
import {
  QUOTE_REQUEST_NO_ACCOUNT_BODY,
  QUOTE_REQUEST_NO_ACCOUNT_SHORT,
} from "@/lib/quote-request-copy";

type Props = {
  /** hero = etusivun hero, compact = lyhyempi yksirivinen */
  variant?: "hero" | "compact";
  className?: string;
};

/** Korostaa että tarjouspyyntö onnistuu ilman tiliä. */
export function GuestQuoteRequestCallout({
  variant = "hero",
  className = "",
}: Props) {
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
