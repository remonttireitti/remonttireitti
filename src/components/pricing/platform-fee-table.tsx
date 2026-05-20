import {
  B2B_PRICE_VAT_NOTE,
  PLATFORM_FEE_CATEGORY_LABELS,
  PLATFORM_FEE_TIERS_CENTS,
  PLATFORM_FEE_VAT_RATE,
  formatPlatformFee,
  type PlatformFeeCategory,
} from "@/lib/platform-fee";

const CATEGORIES: PlatformFeeCategory[] = ["ilp", "large", "maintenance"];

export function PlatformFeeTable({ className = "" }: { className?: string }) {
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full min-w-[20rem] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-stone-200 text-stone-500">
            <th className="py-2 pr-4 font-medium">Palvelu</th>
            <th className="py-2 px-2 font-medium text-center">
              1–3 tarj.
              <span className="block text-[10px] font-normal">veroton</span>
            </th>
            <th className="py-2 px-2 font-medium text-center">
              4–6 tarj.
              <span className="block text-[10px] font-normal">veroton</span>
            </th>
            <th className="py-2 pl-2 font-medium text-center">
              7+ tarj.
              <span className="block text-[10px] font-normal">veroton</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {CATEGORIES.map((cat) => {
            const [a, b, c] = PLATFORM_FEE_TIERS_CENTS[cat];
            return (
              <tr key={cat} className="border-b border-stone-100">
                <td className="py-2.5 pr-4 text-stone-800">
                  {PLATFORM_FEE_CATEGORY_LABELS[cat]}
                </td>
                <td className="py-2.5 px-2 text-center font-medium">
                  {formatPlatformFee(a)}
                </td>
                <td className="py-2.5 px-2 text-center font-medium">
                  {formatPlatformFee(b)}
                </td>
                <td className="py-2.5 pl-2 text-center font-medium">
                  {formatPlatformFee(c)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-stone-500">
        {B2B_PRICE_VAT_NOTE} Tällä hetkellä käytössä ALV{" "}
        {PLATFORM_FEE_VAT_RATE.toLocaleString("fi-FI")} %. Välityspalkkio veloitetaan
        vasta, kun asiakas hyväksyy tarjouksesi. Tarjousten jättäminen on maksutonta.
      </p>
    </div>
  );
}
