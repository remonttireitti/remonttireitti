import Link from "next/link";
import {
  companyFactsEnforcementActive,
  companyFactsEnforcementDateLabel,
  isCompanyFactsComplete,
  type ContractorCompanyFacts,
} from "@/lib/contractor-company-facts";

export function ContractorCompanyFactsBanner({
  facts,
}: {
  facts: ContractorCompanyFacts | null;
}) {
  if (isCompanyFactsComplete(facts)) return null;

  const enforced = companyFactsEnforcementActive();
  const deadline = companyFactsEnforcementDateLabel();

  return (
    <div
      className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
        enforced
          ? "border-amber-300 bg-amber-50 text-amber-950"
          : "border-sky-200 bg-sky-50/80 text-sky-950"
      }`}
      role="status"
    >
      <p className="font-medium">
        {enforced
          ? "Täydennä yritystiedot ennen tarjouksen lähettämistä"
          : "Täydennä yritystiedot tarjousvertailua varten"}
      </p>
      <p className="mt-1 leading-relaxed">
        Asiakkaat näkevät perustamisvuoden ja yrityksen koon tarjouksia
        vertaillessaan.{" "}
        {enforced ? (
          <>Uutta tarjousta ei voi lähettää ennen täydennystä.</>
        ) : (
          <>Pakollinen uusille tarjouksille {deadline} alkaen.</>
        )}
      </p>
      <Link
        href="/oma-tili/yritys#yritystiedot"
        className="mt-2 inline-block font-medium text-sky-800 underline hover:text-sky-950"
      >
        Siirry Oma tili → Yritystiedot
      </Link>
    </div>
  );
}
