import {
  formatCompanySizeBandDisplay,
  formatFoundedYearDisplay,
  type ContractorCompanyFacts,
} from "@/lib/contractor-company-facts";

export function ContractorCompanyFactsCell({
  facts,
}: {
  facts: ContractorCompanyFacts | null;
}) {
  const founded = formatFoundedYearDisplay(facts?.founded_year);
  const size = formatCompanySizeBandDisplay(facts?.company_size_band);

  if (!founded && !size) {
    return <span className="text-stone-400">—</span>;
  }

  return (
    <div className="space-y-1 text-sm text-stone-800">
      {founded && <p>{founded}</p>}
      {size && <p className="text-stone-600">{size}</p>}
    </div>
  );
}
