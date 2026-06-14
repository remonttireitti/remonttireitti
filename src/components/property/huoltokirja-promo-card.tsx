import Link from "next/link";
import { brand } from "@/lib/brand-theme";

type Props = {
  propertyCount: number;
  logEntryCount: number;
  className?: string;
};

export function HuoltokirjaPromoCard({
  propertyCount,
  logEntryCount,
  className = "",
}: Props) {
  const hasProperties = propertyCount > 0;

  return (
    <section
      className={`overflow-hidden rounded-3xl border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-emerald-50/40 p-5 shadow-sm ring-1 ring-sky-100 sm:p-6 ${className}`}
      aria-labelledby="huoltokirja-promo-title"
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <span
              className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-sky-700 text-xl text-white shadow-sm"
              aria-hidden
            >
              🏠
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-sky-800">
                Kiinteistösi
              </p>
              <h2
                id="huoltokirja-promo-title"
                className="text-lg font-bold text-stone-900 sm:text-xl"
              >
                Huoltokirja
              </h2>
            </div>
          </div>

          <p className="mt-3 max-w-xl text-sm leading-relaxed text-stone-600">
            Tallenna kodin perustiedot — lämmitys, ilmanvaihto, pinta-ala ja muut
            tekniset tiedot yhteen paikkaan. Valmiit urakat kirjautuvat automaattisesti
            työhistoriaan.
          </p>

          {hasProperties ? (
            <p className="mt-3 text-sm font-medium text-stone-800">
              {propertyCount}{" "}
              {propertyCount === 1 ? "kiinteistö" : "kiinteistöä"}
              {logEntryCount > 0 && (
                <>
                  {" "}
                  · {logEntryCount}{" "}
                  {logEntryCount === 1 ? "työmerkintä" : "työmerkintää"}
                </>
              )}
            </p>
          ) : (
            <p className="mt-3 text-sm font-medium text-sky-900">
              Et ole vielä lisännyt kiinteistöä — aloita omakotitalosta tai mökin
              perustiedoilla.
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          <Link href="/oma-tili/huoltokirja" className={brand.btnPrimary}>
            {hasProperties ? "Avaa huoltokirja" : "Lisää kiinteistö"}
          </Link>
          {hasProperties && (
            <Link
              href="/oma-tili/huoltokirja/uusi"
              className={`${brand.btnSecondary} text-center`}
            >
              + Uusi kiinteistö
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
