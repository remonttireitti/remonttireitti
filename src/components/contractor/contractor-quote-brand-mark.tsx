import { REMONTTIREITTI_LOGO_PATH } from "@/lib/brand-logo";

/** Remonttireitti-brändi tarjouksen alatunnisteessa (jokaisen sivun alaosa). */
export function ContractorQuoteBrandMark() {
  return (
    <div className="mt-4 flex items-center gap-2.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={REMONTTIREITTI_LOGO_PATH}
        alt=""
        className="h-9 w-9 shrink-0"
      />
      <div className="leading-tight">
        <span className="block text-sm font-semibold tracking-tight text-stone-700">
          Remonttireitti
        </span>
        <span className="block text-[11px] text-stone-500">remonttireitti.fi</span>
      </div>
    </div>
  );
}
