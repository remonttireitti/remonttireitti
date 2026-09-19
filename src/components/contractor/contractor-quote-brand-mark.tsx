import { REMONTTIREITTI_LOGO_PATH } from "@/lib/brand-logo";

/** Remonttireitti-brändi tarjouksen alatunnisteessa. */
export function ContractorQuoteBrandMark() {
  return (
    <div className="mt-4 flex items-center gap-2.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={REMONTTIREITTI_LOGO_PATH}
        alt=""
        className="h-9 w-9 shrink-0"
      />
      <span className="text-sm font-semibold tracking-tight text-stone-700">
        Remonttireitti
      </span>
    </div>
  );
}
