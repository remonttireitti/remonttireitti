import {
  formatElectricalQualification,
  formatLviQualifications,
  formatRefrigerant,
} from "@/lib/format-qualifications";
import type {
  ElectricalQualification,
  LviQualification,
  RefrigerantLicense,
} from "@/types/contractor";

export type ContractorQualificationSummary = {
  refrigerant_license: RefrigerantLicense | null;
  electrical_qualification: ElectricalQualification | null;
  lvi_qualifications: LviQualification[];
};

export function ContractorQualificationsCell({
  quals,
}: {
  quals: ContractorQualificationSummary | null | undefined;
}) {
  if (!quals) {
    return <span className="text-stone-400">—</span>;
  }

  const items: string[] = [];
  const refrigerant = formatRefrigerant(quals.refrigerant_license);
  if (refrigerant !== "—") items.push(`Kylmäaine: ${refrigerant}`);
  const electrical = formatElectricalQualification(
    quals.electrical_qualification,
  );
  if (electrical !== "—") items.push(`Sähkö: ${electrical}`);
  const lvi = formatLviQualifications(quals.lvi_qualifications);
  if (lvi !== "—") items.push(`LVI: ${lvi}`);

  if (items.length === 0) {
    return <span className="text-stone-400">Ei ilmoitettu</span>;
  }

  return (
    <ul className="space-y-0.5 text-xs text-stone-700">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
