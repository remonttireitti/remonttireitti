import Link from "next/link";

export function ContractorTrustBanner() {
  return (
    <div className="mt-4 rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-3 text-sm text-sky-950">
      <p className="font-medium">Vertaile luotettavasti</p>
      <p className="mt-1 leading-relaxed text-sky-900/90">
        Jokainen tarjous näyttää, vahvistaako urakoitsija luvat ja
        rakennusvaatimukset. Tähtiarvostelut tulevat valmiista urakoista —{" "}
        <Link href="/#luottamus" className="font-medium underline">
          lue lisää
        </Link>
        .
      </p>
    </div>
  );
}
