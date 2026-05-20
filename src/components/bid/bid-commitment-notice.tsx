import { BID_COMMITMENT_NOTICE } from "@/lib/bid-acceptance";

export function BidCommitmentNotice({ mode }: { mode: "create" | "edit" }) {
  if (mode === "edit") return null;

  return (
    <div className="rounded-lg border border-sky-100 bg-sky-50/80 px-3 py-3 text-sm text-stone-700">
      <p className="font-medium text-stone-900">Sitoumus tarjoukseen</p>
      <p className="mt-1 leading-relaxed">{BID_COMMITMENT_NOTICE}</p>
    </div>
  );
}
