import Link from "next/link";

type Props = {
  variant?: "strip" | "compact";
  className?: string;
};

/** Remonttilaskurit — hinta-arvio ennen kilpailutusta. */
export function HomeCalculatorCallout({
  variant = "strip",
  className = "",
}: Props) {
  if (variant === "compact") {
    return (
      <aside
        className={`rounded-xl border border-violet-200 bg-violet-50/60 px-4 py-3 ${className}`}
      >
        <p className="text-sm text-stone-700">
          <span className="font-semibold text-violet-950">Remonttilaskurit:</span>{" "}
          arvioi hinta ennen tarjouspyyntöä — lämpöpumppu, kylpyhuone, keittiö ja muut.{" "}
          <Link href="/laskurit" className="font-medium text-violet-800 hover:underline">
            Avaa laskurit →
          </Link>
        </p>
      </aside>
    );
  }

  return (
    <aside
      className={`rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50/90 via-white to-sky-50/40 px-4 py-4 sm:px-5 sm:py-4 ${className}`}
    >
      <p className="text-base font-bold tracking-tight text-violet-950 sm:text-lg">
        Arvioi remontin hinta laskurilla
      </p>
      <p className="mt-1.5 text-sm leading-relaxed text-stone-700">
        Ilmaiset hinta-arviot lämpöpumpuista, kylpyhuoneesta, keittiöstä, katosta ja
        piharakennuksista. Muokattavat viitehinnat — kilpailuta sitten ilmaiseksi.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Link
          href="/laskurit"
          className="inline-flex items-center justify-center rounded-xl bg-violet-800 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-900"
        >
          Remonttilaskurit
        </Link>
        <span className="text-xs text-stone-500">
          Esim. ilmalämpöpumppu · kylpyhuone · terassi
        </span>
      </div>
    </aside>
  );
}
