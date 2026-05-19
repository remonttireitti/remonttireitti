import { ActivateContractorForm } from "@/components/account/activate-contractor-form";

export function ContractorActivationBanner({
  defaultCompany,
  compact,
}: {
  defaultCompany?: string;
  compact?: boolean;
}) {
  return (
    <section
      className={`rounded-xl border border-amber-200 bg-amber-50/90 ${
        compact ? "p-4" : "p-5"
      }`}
    >
      <h2 className={`font-semibold text-amber-950 ${compact ? "text-base" : "text-lg"}`}>
        Urakoitsijatili ei aktiivinen
      </h2>
      <p className="mt-2 text-sm text-amber-900">
        Rekisteröidyit urakoitsijana, mutta tietokannassa rooli on vielä asiakas.
        Korjaa alla — ei tarvitse luoda uutta tiliä.
      </p>
      <ActivateContractorForm defaultCompany={defaultCompany} />
    </section>
  );
}
