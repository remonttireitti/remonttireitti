import Link from "next/link";
import { brand } from "@/lib/brand-theme";

/** Kuluttajan laskurisivun vieressä: erillinen urakoitsijan tarjouslaskuri-näkymä. */
export function ContractorCalculatorBanner({
  calculatorTitle,
  className = "",
}: {
  calculatorTitle: string;
  className?: string;
}) {
  return (
    <aside
      className={`rounded-2xl border-2 border-sky-200 bg-gradient-to-b from-sky-50/90 to-white p-5 sm:p-6 ${className}`}
    >
      <p className="text-sm font-semibold uppercase tracking-wide text-sky-800">
        Urakoitsijalle
      </p>
      <h2 className="mt-2 text-lg font-bold text-sky-950">Laske tarjous</h2>
      <p className="mt-2 text-sm leading-relaxed text-stone-700">
        Tämä sivu on asiakkaalle suuntaa-antava arvio. Urakoitsijana lasket
        tarjouksen omilla hinnoillasi ja katteellasi — sama {calculatorTitle}{" "}
        -moottori, eri tarkoitus.
      </p>
      <ul className="mt-3 space-y-1.5 text-sm text-stone-600">
        <li>→ Tarjouspyyntö → laskuri → tarjous → lähetä</li>
        <li>→ Vertailukelpoiset rivit asiakkaalle</li>
        <li>→ Omat hinnat tallennetaan Oma tili -sivulle</li>
      </ul>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link href="/tarjouslaskuri" className={`${brand.btnPrimary} text-sm`}>
          Laske tarjous →
        </Link>
        <Link href="/tarjoukset" className="text-sm font-medium text-sky-800 hover:underline">
          Tarjouspyynnöt
        </Link>
        <Link
          href="/oma-tili/yritys#laskentaparametrit"
          className="text-sm font-medium text-sky-800 hover:underline"
        >
          Laskentaparametrit
        </Link>
      </div>
    </aside>
  );
}
