import Link from "next/link";
import { APU_REQUIRES_LOGIN_SHORT } from "@/lib/quote-request-copy";

/** Kannustava intro Apu-sivun yläosaan. */
export function HelpCommunityBanner() {
  return (
    <aside className="mt-6 rounded-2xl border border-rose-200/80 bg-gradient-to-br from-rose-50/90 via-white to-amber-50/50 p-5 sm:p-6">
      <p className="text-sm leading-relaxed text-stone-700">
        <span className="font-semibold text-stone-900">
          Kaikkeen ei tarvitse maksaa.
        </span>{" "}
        Kun remontti painaa ja apua tarvitaan heti — kantamisessa, siirtämisessä
        tai muussa pienessä — lähialueella on usein ihmisiä, jotka auttavat
        mielellään ilmaiseksi. Tämä on sitä varten: vapaaehtoista naapuriapua,
        ei urakkaa eikä laskua.
      </p>
      <p className="mt-3 text-sm text-stone-600">
        <span className="font-medium text-stone-800">{APU_REQUIRES_LOGIN_SHORT}</span>{" "}
        Tarjouspyynnön voit jättää ilman tiliä{" "}
        <Link href="/remontti/uusi" className="font-medium text-sky-700 hover:underline">
          täällä
        </Link>
        .
      </p>
      <p className="mt-3 text-sm text-stone-600">
        Ylijäämätavaraa? Katso myös{" "}
        <Link
          href="/markkinapaikka/ilmoitukset?tyyppi=lahjoitus"
          className="font-medium text-emerald-800 hover:underline"
        >
          Annetaan ilmaiseksi
        </Link>{" "}
        torilla.
      </p>
    </aside>
  );
}
