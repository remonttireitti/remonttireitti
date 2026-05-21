"use client";

import { useActionState, useState } from "react";
import {
  acceptBid,
  rejectBid,
  submitCounterOffer,
  type CounterOfferActionState,
  type RejectBidActionState,
} from "@/app/actions/bids";
import {
  formatCounterOfferStatus,
  hasPendingCounterOffer,
  type BidCounterFields,
} from "@/lib/bid-counter-offer";
import {
  bidHasSplitEquipmentOffer,
  formatBidAcceptScopeShort,
} from "@/lib/bid-accept-scope";
import { bidTotalAmountCents, bidWorkAmountCents } from "@/lib/bid-amounts";
import { STALE_BID_CUSTOMER_MESSAGE } from "@/lib/bid-staleness";
import { formatEurosFromCents } from "@/lib/bids";

const inputClass =
  "mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-sky-600 focus:outline-none focus:ring-1 focus:ring-sky-600";

export function CustomerBidActions({
  bidId,
  projectId,
  bid,
  stale = false,
}: {
  bidId: string;
  projectId: string;
  bid: BidCounterFields & {
    amount_cents: number;
    offers_equipment?: boolean | null;
    equipment_amount_cents?: number | null;
    equipment_description?: string | null;
  };
  stale?: boolean;
}) {
  const [showCounterForm, setShowCounterForm] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [state, counterAction, submitting] = useActionState<
    CounterOfferActionState,
    FormData
  >(submitCounterOffer, {});
  const [rejectState, rejectAction, rejecting] = useActionState<
    RejectBidActionState,
    FormData
  >(rejectBid, {});

  const counterLabel = formatCounterOfferStatus(bid);
  const counterPending = hasPendingCounterOffer(bid);
  const counterAccepted = bid.counter_status === "accepted";
  const counterDeclined = bid.counter_status === "declined";
  const canAcceptFinal = !stale && !counterPending;
  const splitOffer = bidHasSplitEquipmentOffer(bid);

  return (
    <div className="space-y-2">
      {counterLabel && (
        <p
          className={`text-xs ${
            bid.counter_status === "pending"
              ? "font-medium text-amber-800"
              : "text-stone-600"
          }`}
        >
          {counterLabel}
        </p>
      )}

      {stale && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {STALE_BID_CUSTOMER_MESSAGE}
        </p>
      )}

      {counterPending && bid.counter_amount_cents != null && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          Odota urakoitsijan vastausta vastatarjoukseen{" "}
          <strong>{formatEurosFromCents(bid.counter_amount_cents)}</strong>.
          Urakoitsija voi hyväksyä sen tai hylätä ja säilyttää alkuperäisen hinnan{" "}
          <strong>{formatEurosFromCents(bid.amount_cents)}</strong>. Et voi
          hyväksyä tarjousta ennen vastausta.
        </p>
      )}

      {counterAccepted && (
        <p className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900">
          Urakoitsija hyväksyi vastatarjouksesi. Hinta on nyt{" "}
          <strong>{formatEurosFromCents(bid.amount_cents)}</strong>. Voit hyväksyä
          tarjouksen lopullisesti alla.
        </p>
      )}

      {counterDeclined && bid.counter_amount_cents != null && (
        <p className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-700">
          Urakoitsija hylkäsi vastatarjouksesi (
          {formatEurosFromCents(bid.counter_amount_cents)}). Alkuperäinen hinta{" "}
          {formatEurosFromCents(bid.amount_cents)} on voimassa — voit hyväksyä sen
          tai jättää uuden vastatarjouksen.
        </p>
      )}

      {canAcceptFinal && splitOffer && (
        <div className="space-y-2 rounded-lg border border-sky-100 bg-sky-50/50 p-3">
          <p className="text-xs font-medium text-stone-800">
            Urakoitsija tarjoaa asennusta ja laitetta erillisillä hinnoilla.
            Valitse mitä hyväksyt:
          </p>
          {bid.equipment_description && (
            <p className="text-xs text-stone-600">
              Laite: {bid.equipment_description}
            </p>
          )}
          <form action={acceptBid}>
            <input type="hidden" name="bid_id" value={bidId} />
            <input type="hidden" name="project_id" value={projectId} />
            <input type="hidden" name="include_equipment" value="0" />
            <button
              type="submit"
              className="w-full rounded-lg bg-orange-700 px-3 py-2 text-sm font-medium text-white hover:bg-orange-800"
            >
              Hyväksy vain asennus —{" "}
              {formatEurosFromCents(bidWorkAmountCents(bid))}
            </button>
          </form>
          <form action={acceptBid}>
            <input type="hidden" name="bid_id" value={bidId} />
            <input type="hidden" name="project_id" value={projectId} />
            <input type="hidden" name="include_equipment" value="1" />
            <button
              type="submit"
              className="w-full rounded-lg border-2 border-orange-700 bg-white px-3 py-2 text-sm font-medium text-orange-800 hover:bg-orange-50"
            >
              Hyväksy {formatBidAcceptScopeShort(true)} —{" "}
              {formatEurosFromCents(bidTotalAmountCents(bid))}
              <span className="mt-0.5 block text-xs font-normal text-stone-600">
                ({formatEurosFromCents(bidWorkAmountCents(bid))} + laite{" "}
                {formatEurosFromCents(bid.equipment_amount_cents!)})
              </span>
            </button>
          </form>
        </div>
      )}

      {canAcceptFinal && !splitOffer && (
        <form action={acceptBid}>
          <input type="hidden" name="bid_id" value={bidId} />
          <input type="hidden" name="project_id" value={projectId} />
          <button
            type="submit"
            className="w-full rounded-lg bg-orange-700 px-3 py-2 text-sm font-medium text-white hover:bg-orange-800"
          >
            Hyväksy {formatEurosFromCents(bid.amount_cents)}
          </button>
        </form>
      )}

      {!showCounterForm ? (
        <button
          type="button"
          onClick={() => {
            setShowRejectForm(false);
            setShowCounterForm(true);
          }}
          disabled={counterPending || stale}
          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-60"
        >
          {counterPending ? "Vastatarjous odottaa" : "Jätä vastatarjous"}
        </button>
      ) : (
        <form
          action={counterAction}
          className="rounded-lg border border-stone-200 bg-stone-50 p-3"
        >
          <input type="hidden" name="bid_id" value={bidId} />
          <input type="hidden" name="project_id" value={projectId} />
          <p className="text-xs font-medium text-stone-700">
            Ehdota uutta hintaa (€, sis. ALV)
            {splitOffer && " — koskee asennusta"}
          </p>
          <input
            name="counter_amount_euros"
            type="number"
            min={1}
            step={1}
            required
            className={inputClass}
            placeholder="13000"
          />
          <label className="mt-2 block text-xs font-medium text-stone-700">
            Viesti (valinnainen)
          </label>
          <textarea
            name="counter_message"
            rows={2}
            className={inputClass}
            placeholder="Perustelut hintaehdotukselle…"
          />
          {state.error && (
            <p className="mt-2 text-xs text-red-600">{state.error}</p>
          )}
          {state.success && (
            <p className="mt-2 text-xs text-sky-700">{state.success}</p>
          )}
          <div className="mt-2 flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-lg bg-sky-600 py-1.5 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60"
            >
              {submitting ? "Lähetetään…" : "Lähetä"}
            </button>
            <button
              type="button"
              onClick={() => setShowCounterForm(false)}
              className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm text-stone-600 hover:bg-white"
            >
              Peruuta
            </button>
          </div>
        </form>
      )}

      {!showRejectForm ? (
        <button
          type="button"
          onClick={() => {
            setShowCounterForm(false);
            setShowRejectForm(true);
          }}
          disabled={stale}
          className="w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800 hover:bg-red-100 disabled:opacity-60"
        >
          Hylkää tarjous
        </button>
      ) : (
        <form
          action={rejectAction}
          className="rounded-lg border border-red-200 bg-red-50/50 p-3"
        >
          <input type="hidden" name="bid_id" value={bidId} />
          <input type="hidden" name="project_id" value={projectId} />
          <label className="block text-xs font-medium text-red-900">
            Miksi tarjous ei sovi? (näkyy urakoitsijalle)
          </label>
          <textarea
            name="rejection_message"
            rows={3}
            required
            minLength={5}
            className={inputClass}
            placeholder="Esim. hinta yli budjetin, aikataulu ei sovi…"
          />
          {rejectState.error && (
            <p className="mt-2 text-xs text-red-600">{rejectState.error}</p>
          )}
          {rejectState.success && (
            <p className="mt-2 text-xs text-red-800">{rejectState.success}</p>
          )}
          <div className="mt-2 flex gap-2">
            <button
              type="submit"
              disabled={rejecting}
              className="flex-1 rounded-lg bg-red-700 py-1.5 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-60"
            >
              {rejecting ? "Hylätään…" : "Vahvista hylkäys"}
            </button>
            <button
              type="button"
              onClick={() => setShowRejectForm(false)}
              className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm text-stone-600 hover:bg-white"
            >
              Peruuta
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
