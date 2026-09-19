import { formatPlatformFee } from "@/lib/platform-fee";

export function CustomerReferralCreditsPanel({
  availableCount,
  totalAmountCents,
}: {
  availableCount: number;
  totalAmountCents: number;
}) {
  if (availableCount <= 0) return null;

  return (
    <section className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
      <h2 className="text-lg font-semibold text-emerald-950">Suosittelubonukset</h2>
      <p className="mt-1 text-sm text-emerald-900/90">
        Olet ansainnut {availableCount}{" "}
        {availableCount === 1 ? "bonuksen" : "bonusta"} suosittelemiesi asiakkaiden
        tarjouspyynnöistä tai urakoitsijoiden diileistä. Seuraavassa hyväksytyssä urakassasi urakoitsija vähentää bonuksen
        verran ({formatPlatformFee(totalAmountCents / availableCount)} veroton / bonus)
        urakkasi hinnasta — sinulle ei synny erillistä maksua, eikä urakoitsijalle
        välityslaskua.
      </p>
      <p className="mt-2 text-xs text-emerald-800/80">
        Bonus käytetään vain, jos valittu urakoitsija ei käytä omaa ilmaista etuaan
        samalla diilillä — et voi saada alennusta ja urakoitsija ilmaista diiliä
        yhtä aikaa.
      </p>
    </section>
  );
}
