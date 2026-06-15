import Link from "next/link";
import {
  platformFeeBetaPromoBody,
  platformFeeBetaPromoTitle,
} from "@/lib/platform-fee-beta";

export function BetaPlatformFeeBanner({
  className = "",
  showCta = true,
}: {
  className?: string;
  showCta?: boolean;
}) {
  const title = platformFeeBetaPromoTitle();
  const body = platformFeeBetaPromoBody();
  if (!title || !body) return null;

  return (
    <aside
      className={`rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50/95 to-white p-4 text-sm text-emerald-950 shadow-sm ${className}`}
      role="note"
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
        Beta-tarjous urakoitsijalle
      </p>
      <p className="mt-1 font-semibold">{title}</p>
      <p className="mt-1 leading-relaxed text-stone-800">{body}</p>
      {showCta && (
        <Link
          href="/rekisteroidy?rooli=urakoitsija"
          className="mt-3 inline-block font-semibold text-emerald-900 hover:underline"
        >
          Rekisteröidy urakoitsijaksi →
        </Link>
      )}
    </aside>
  );
}
