"use client";

import { useActionState } from "react";
import {
  claimEvaluationRequest,
  type BidEvaluationActionState,
} from "@/app/actions/bid-evaluation";
import { useActionRedirect } from "@/hooks/use-action-redirect";

export function EvaluationClaimButton({ requestId }: { requestId: string }) {
  const [state, action, pending] = useActionState<
    BidEvaluationActionState,
    FormData
  >(claimEvaluationRequest, {});

  useActionRedirect(state);

  return (
    <form action={action}>
      <input type="hidden" name="request_id" value={requestId} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-800 disabled:opacity-60"
      >
        {pending ? "Otetaan…" : "Ota arvioitavaksi"}
      </button>
    </form>
  );
}
