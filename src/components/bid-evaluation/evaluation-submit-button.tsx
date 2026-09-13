"use client";

import { useActionState } from "react";
import {
  submitBidEvaluationRequest,
  type BidEvaluationActionState,
} from "@/app/actions/bid-evaluation";
import { brand } from "@/lib/brand-theme";

export function EvaluationSubmitButton({ requestId }: { requestId: string }) {
  const [, action, pending] = useActionState<
    BidEvaluationActionState,
    FormData
  >(submitBidEvaluationRequest, {});

  return (
    <form action={action}>
      <input type="hidden" name="request_id" value={requestId} />
      <button type="submit" disabled={pending} className={`${brand.btnPrimary} disabled:opacity-60`}>
        {pending ? "Lähetetään…" : "Lähetä arvioitavaksi (0 €)"}
      </button>
    </form>
  );
}
