import Link from "next/link";

type Props = {
  isLoggedIn?: boolean;
  className?: string;
};

/** Hero-oikea: Pieni apu — vapaaehtoinen naapuriapu. */
export function HomeHelpCallout({ isLoggedIn = false, className = "" }: Props) {
  const requestHref = isLoggedIn ? "/apu/uusi" : "/kirjaudu?redirect=/apu/uusi";
  const offerHref = isLoggedIn ? "/apu" : "/kirjaudu?redirect=/apu";

  return (
    <aside
      className={`rounded-2xl border-2 border-rose-300 bg-gradient-to-r from-rose-50 via-white to-amber-50/80 px-4 py-4 shadow-md ring-1 ring-rose-200/80 sm:px-6 sm:py-5 ${className}`}
    >
      <p className="text-lg font-bold tracking-tight text-rose-950 sm:text-xl">
        Tarvitsetko pientä apua?
      </p>
      <p className="mt-2 text-sm leading-relaxed text-stone-700 sm:text-base">
        Homma on liian pieni ammattilaiselle — tai tilanne on akuutti eikä maksukyky
        riitä. Pyydä naapurilta tai paikalliselta vapaaehtoista apua kantamisessa,
        siirtämisessä ja muissa pienissä asioissa.
      </p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            href={requestHref}
            className="inline-flex items-center justify-center rounded-xl bg-rose-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-800"
          >
            {isLoggedIn ? "Pyydä apua" : "Kirjaudu ja pyydä apua"}
          </Link>
          <Link
            href={offerHref}
            className="inline-flex items-center justify-center rounded-xl border border-rose-200 bg-white px-5 py-2.5 text-sm font-semibold text-rose-900 transition hover:bg-rose-50"
          >
            Tarjoa apua
          </Link>
        </div>
        <p className="text-xs text-stone-500 sm:max-w-[14rem] sm:text-right">
          Auttajaksi rekisteröityminen. Yhteystiedot avoinna kirjautuneille.
        </p>
      </div>
    </aside>
  );
}
