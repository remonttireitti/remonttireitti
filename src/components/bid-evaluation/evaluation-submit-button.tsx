"use client";

import { useActionState } from "react";
import {
  submitBidEvaluationRequest,
  type BidEvaluationActionState,
} from "@/app/actions/bid-evaluation";
import {
  formatEvaluationPriceLabel,
  type BidEvaluationSettings,
} from "@/lib/bid-evaluation";
import { brand } from "@/lib/brand-theme";

export function EvaluationSubmitButton({
  requestId,
  settings,
  bidCount,
}: {
  requestId: string;
  settings: BidEvaluationSettings;
  bidCount: number;
}) {
  const [, action, pending] = useActionState<
    BidEvaluationActionState,
    FormData
  >(submitBidEvaluationRequest, {});

  const priceLabel = formatEvaluationPriceLabel(settings, bidCount);

  return (
    <form action={action}>
      <input type="hidden" name="request_id" value={requestId} />
      <button type="submit" disabled={pending} className={`${brand.btnPrimary} disabled:opacity-60`}>
        {pending ? "Lähetetään…" : `Lähetä arvioitavaksi (${priceLabel})`}
      </button>
    </form>
  );
}
