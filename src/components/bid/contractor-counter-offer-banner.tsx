"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  acceptCounterOffer,
  declineCounterOffer,
} from "@/app/actions/bids";
import { formatEurosFromCents } from "@/lib/bids";
import type { BidCounterFields } from "@/lib/bid-counter-offer";

export function ContractorCounterOfferBanner({
  bidId,
  projectId,
  bid,
}: {
  bidId: string;
  projectId: string;
  bid: BidCounterFields & { amount_cents: number };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"accept" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (bid.counter_status !== "pending" || bid.counter_amount_cents == null) {
    return null;
  }

  async function handleAccept() {
    if (
      !window.confirm(
        `Hyväksytkö asiakkaan vastatarjouksen ${formatEurosFromCents(bid.counter_amount_cents!)}? Tarjouksesi hinta päivitetään.`,
      )
    ) {
      return;
    }
    setBusy("accept");
    setError(null);
    const fd = new FormData();
    fd.set("bid_id", bidId);
    fd.set("project_id", projectId);
    const result = await acceptCounterOffer(fd);
    setBusy(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function handleDecline() {
    if (
      !window.confirm(
        `Hylkää asiakkaan vastatarjous ${formatEurosFromCents(bid.counter_amount_cents!)}? Alkuperäinen tarjouksesi ${formatEurosFromCents(bid.amount_cents)} säilyy voimassa.`,
      )
    ) {
      return;
    }
    setBusy("decline");
    setError(null);
    const fd = new FormData();
    fd.set("bid_id", bidId);
    fd.set("project_id", projectId);
    const result = await declineCounterOffer(fd);
    setBusy(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-5">
      <h3 className="font-semibold text-amber-950">Asiakkaan vastatarjous</h3>
      <p className="mt-1 text-2xl font-bold text-amber-900">
        {formatEurosFromCents(bid.counter_amount_cents)}
      </p>
      {bid.counter_message?.trim() && (
        <p className="mt-2 text-sm whitespace-pre-wrap text-amber-950">
          {bid.counter_message}
        </p>
      )}
      <p className="mt-2 text-sm text-amber-800">
        Nykyinen tarjouksesi: {formatEurosFromCents(bid.amount_cents)}. Hyväksymällä
        vastatarjouksen hinta päivittyy asiakkaan ehdotukseen.
      </p>
      {error && (
        <p className="mt-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleAccept}
          disabled={busy !== null}
          className="rounded-lg bg-orange-700 px-4 py-2 text-sm font-medium text-white hover:bg-orange-800 disabled:opacity-60"
        >
          {busy === "accept" ? "Hyväksytään…" : "Hyväksy vastatarjous"}
        </button>
        <button
          type="button"
          onClick={handleDecline}
          disabled={busy !== null}
          className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-60"
        >
          {busy === "decline" ? "Hylätään…" : "Hylkää, säilytä alkuperäinen hinta"}
        </button>
      </div>
    </div>
  );
}
