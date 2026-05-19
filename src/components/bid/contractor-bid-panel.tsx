"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { withdrawBid } from "@/app/actions/bids";
import { ContractorCounterOfferBanner } from "@/components/bid/contractor-counter-offer-banner";
import { BidDetailsDisplay } from "@/components/bid/bid-details-display";
import { BidForm } from "@/components/bid/bid-form";
import type { BidCounterFields } from "@/lib/bid-counter-offer";
import { bidToFormFields, type BidRecordForForm } from "@/lib/bid-form";
import { STALE_BID_CONTRACTOR_MESSAGE } from "@/lib/bid-staleness";
import { bidStatusLabels, formatEurosFromCents } from "@/lib/bids";
import type { ProjectBudgetInfo } from "@/lib/project-budget";
import type { BidStatus } from "@/types/database";

type BidView = BidRecordForForm &
  BidCounterFields & {
    id: string;
    status: BidStatus;
    rejection_message?: string | null;
    rejected_at?: string | null;
  };

export function ContractorBidPanel({
  projectId,
  bid,
  requiresEquipmentWarranty,
  budgetInfo,
  bidStale = false,
}: {
  projectId: string;
  bid: BidView | null;
  requiresEquipmentWarranty: boolean;
  budgetInfo: ProjectBudgetInfo;
  bidStale?: boolean;
}) {
  const router = useRouter();
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);

  if (!bid) {
    return (
      <div className="mt-8">
        <h2 className="text-lg font-semibold">Jätä tarjous</h2>
        <div className="mt-4">
          <BidForm
            projectId={projectId}
            requiresEquipmentWarranty={requiresEquipmentWarranty}
            budgetInfo={budgetInfo}
            mode="create"
          />
        </div>
      </div>
    );
  }

  if (bid.status === "rejected") {
    return (
      <div className="mt-8 space-y-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="font-medium text-red-900">Asiakas hylkäsi tarjouksesi</p>
          {bid.rejection_message && (
            <p className="mt-2 text-sm whitespace-pre-wrap text-red-800">
              {bid.rejection_message}
            </p>
          )}
          <p className="mt-2 text-sm text-red-700">
            Voit päivittää tarjouksen alla ja lähettää sen uudelleen.
          </p>
        </div>
        <BidForm
          projectId={projectId}
          requiresEquipmentWarranty={requiresEquipmentWarranty}
          budgetInfo={budgetInfo}
          mode="edit"
          bidId={bid.id}
          initialFields={bidToFormFields(bid)}
        />
      </div>
    );
  }

  if (bid.status === "withdrawn") {
    return (
      <div>
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
          <p className="font-medium text-stone-800">Tarjouksesi on peruttu</p>
          <p className="mt-1 text-sm text-stone-600">
            Asiakas ei näe peruttua tarjousta. Voit jättää uuden tarjouksen alla.
          </p>
        </div>
        <div>
          <h2 className="text-lg font-semibold">Uusi tarjous</h2>
          <div className="mt-4">
            <BidForm
              projectId={projectId}
              requiresEquipmentWarranty={requiresEquipmentWarranty}
              budgetInfo={budgetInfo}
              mode="create"
            />
          </div>
        </div>
      </div>
    );
  }

  if (bid.status !== "submitted") {
    return (
      <div className="mt-8 rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="font-semibold text-stone-900">Tarjouksesi</h2>
        <p className="mt-1 text-sm text-stone-500">
          Tila: {bidStatusLabels[bid.status]}
        </p>
        <p className="mt-2 text-2xl font-bold text-sky-800">
          {formatEurosFromCents(bid.amount_cents)}
        </p>
        <BidDetailsDisplay bid={bid} />
        <p className="mt-3 text-sm whitespace-pre-wrap text-stone-700">
          {bid.message}
        </p>
        {bid.status === "accepted" && (
          <p className="mt-3 text-sm text-sky-800">
            Asiakas hyväksyi tarjouksesi. Siirry urakkasivulle viestintää varten.
          </p>
        )}
      </div>
    );
  }

  async function handleWithdraw(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (
      !window.confirm(
        "Haluatko varmasti perua tarjouksen? Asiakas ei enää näe sitä.",
      )
    ) {
      return;
    }
    setWithdrawing(true);
    setWithdrawError(null);
    const result = await withdrawBid(new FormData(e.currentTarget));
    setWithdrawing(false);
    if (result.error) {
      setWithdrawError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-8 space-y-6">
      {bidStale && (
        <p
          className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
          role="status"
        >
          {STALE_BID_CONTRACTOR_MESSAGE}
        </p>
      )}

      <ContractorCounterOfferBanner
        bidId={bid.id}
        projectId={projectId}
        bid={bid}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Tarjouksesi</h2>
        <form onSubmit={handleWithdraw}>
          <input type="hidden" name="project_id" value={projectId} />
          <input type="hidden" name="bid_id" value={bid.id} />
          <button
            type="submit"
            disabled={withdrawing}
            className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-60"
          >
            {withdrawing ? "Perutaan…" : "Peru tarjous"}
          </button>
        </form>
      </div>

      {withdrawError && (
        <p className="text-sm text-red-600" role="alert">
          {withdrawError}
        </p>
      )}

      <p className="text-sm text-stone-600">
        Voit muokata tarjousta niin kauan kuin asiakas ei ole sitä hyväksynyt.
        Tallenna muutokset lomakkeen alareunasta.
      </p>

      <BidForm
        projectId={projectId}
        requiresEquipmentWarranty={requiresEquipmentWarranty}
        budgetInfo={budgetInfo}
        mode="edit"
        bidId={bid.id}
        initialFields={bidToFormFields(bid)}
      />
    </div>
  );
}
