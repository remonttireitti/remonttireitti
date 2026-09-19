import Link from "next/link";

type Props = {
  variant?: "strip" | "compact";
  className?: string;
};

/** Urakoitsijalle: tarjouslaskuri samalla moottorilla kuin kuluttajan laskurit. */
export function HomeContractorCalculatorCallout({
  variant = "strip",
  className = "",
}: Props) {
  if (variant === "compact") {
    return (
      <aside
        className={`rounded-xl border border-orange-200 bg-orange-50/60 px-4 py-3 ${className}`}
      >
        <p className="text-sm text-stone-700">
          <span className="font-semibold text-orange-950">Urakoitsijalle:</span>{" "}
          laske tarjous samalla laskurilla — omat hinnat ja PDF.{" "}
          <Link href="/urakoitsijaksi" className="font-medium text-orange-800 hover:underline">
            Lue lisää →
          </Link>
        </p>
      </aside>
    );
  }

  return (
    <aside
      className={`rounded-2xl border border-orange-200 bg-gradient-to-r from-orange-50/90 via-white to-sky-50/40 px-4 py-4 sm:px-5 sm:py-4 ${className}`}
    >
      <p className="text-base font-bold tracking-tight text-orange-950 sm:text-lg">
        Urakoitsijalle: laske tarjous laskurilla
      </p>
      <p className="mt-1.5 text-sm leading-relaxed text-stone-700">
        Sama laskuri moottori ammattimaisiin tarjouksiin — omat hinnat, katteet ja
        PDF-tuloste. Tarjouspyyntö → laskuri → tarjous → lähetä.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Link
          href="/urakoitsijaksi"
          className="inline-flex items-center justify-center rounded-xl bg-orange-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-800"
        >
          Urakoitsijaksi
        </Link>
        <Link
          href="/kirjaudu?redirect=%2Ftarjouslaskuri"
          className="inline-flex items-center justify-center rounded-xl border border-orange-200 bg-white px-5 py-2.5 text-sm font-semibold text-orange-900 transition hover:bg-orange-50"
        >
          Tarjouslaskuri
        </Link>
        <span className="text-xs text-stone-500">
          Omat hinnat · PDF-tarjous · ilmainen tarjous
        </span>
      </div>
    </aside>
  );
}
