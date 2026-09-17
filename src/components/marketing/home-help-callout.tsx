import Link from "next/link";

type Props = {
  isLoggedIn?: boolean;
  variant?: "card" | "compact";
  className?: string;
};

/** Pieni apu — vapaaehtoinen naapuriapu. */
export function HomeHelpCallout({
  isLoggedIn = false,
  variant = "card",
  className = "",
}: Props) {
  const requestHref = isLoggedIn ? "/apu/uusi" : "/kirjaudu?redirect=/apu/uusi";
  const offerHref = isLoggedIn ? "/apu" : "/kirjaudu?redirect=/apu";

  if (variant === "compact") {
    return (
      <aside
        className={`rounded-xl border border-rose-200 bg-rose-50/60 px-4 py-3 ${className}`}
      >
        <p className="text-sm text-stone-700">
          <span className="font-semibold text-rose-950">Pieni apu:</span> liian
          pieni ammattilaiselle tai ei varaa maksaa?{" "}
          <Link href={requestHref} className="font-medium text-rose-800 hover:underline">
            Pyydä apua
          </Link>
          {" · "}
          <Link href={offerHref} className="font-medium text-rose-800 hover:underline">
            Tarjoa apua
          </Link>
        </p>
      </aside>
    );
  }

  return (
    <aside
      className={`rounded-2xl border border-rose-200 bg-gradient-to-r from-rose-50/90 via-white to-amber-50/50 px-4 py-4 sm:px-5 sm:py-4 ${className}`}
    >
      <p className="text-base font-bold tracking-tight text-rose-950 sm:text-lg">
        Tarvitsetko pientä apua?
      </p>
      <p className="mt-1.5 text-sm leading-relaxed text-stone-700">
        Homma on liian pieni ammattilaiselle — tai tilanne on akuutti eikä maksukyky
        riitä. Pyydä naapurilta vapaaehtoista apua kantamisessa ja muissa pienissä
        asioissa.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Link
          href={requestHref}
          className="inline-flex items-center justify-center rounded-xl bg-rose-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-800"
        >
          {isLoggedIn ? "Pyydä apua" : "Kirjaudu ja pyydä apua"}
        </Link>
        <Link
          href={offerHref}
          className="inline-flex items-center justify-center rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-900 transition hover:bg-rose-50"
        >
          Tarjoa apua
        </Link>
        <span className="text-xs text-stone-500">
          Auttajaksi rekisteröityminen · yhteystiedot kirjautuneille
        </span>
      </div>
    </aside>
  );
}
