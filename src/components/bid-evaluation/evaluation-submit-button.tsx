"use client";

import { useActionState } from "react";
import {
  submitBidEvaluationRequest,
  type BidEvaluationActionState,
} from "@/app/actions/bid-evaluation";
import { useActionRedirect } from "@/hooks/use-action-redirect";
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
  const [state, action, pending] = useActionState<
    BidEvaluationActionState,
    FormData
  >(submitBidEvaluationRequest, {});

  useActionRedirect(state);

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
