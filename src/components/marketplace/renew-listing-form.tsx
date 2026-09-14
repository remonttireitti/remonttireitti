"use client";

import { renewExpiredListing } from "@/app/actions/marketplace-listings";
import { useListingFormSubmit } from "@/components/marketplace/use-listing-form-submit";
import { brand } from "@/lib/brand-theme";
import { LISTING_SINGLE } from "@/lib/marketplace-pricing";

export function RenewListingForm({
  listingId,
  sellerType,
  subscriptionSlots,
  subscriptionPlanName,
  compact = false,
}: {
  listingId: string;
  sellerType: "customer" | "contractor";
  subscriptionSlots: number;
  subscriptionPlanName: string | null;
  /** Pienempi painike listanäkymään. */
  compact?: boolean;
}) {
  const { state, submit, pending } = useListingFormSubmit(renewExpiredListing);
  const canUseSubscription =
    sellerType === "contractor" && subscriptionSlots > 0;
  const isContractor = sellerType === "contractor";
  const singleOnly = isContractor && !canUseSubscription;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit(new FormData(e.currentTarget));
      }}
      className={compact ? "inline-flex flex-col items-end gap-1" : "space-y-4"}
    >
      <input type="hidden" name="listing_id" value={listingId} />

      {singleOnly && <input type="hidden" name="billing_mode" value="single" />}

      {!compact && isContractor && !singleOnly && (
        <fieldset className="rounded-xl border border-amber-200 bg-white/80 p-4">
          <legend className="text-sm font-semibold text-amber-950">
            Uusimistapa
          </legend>
          <div className="mt-3 space-y-2 text-sm">
            <label className="flex cursor-pointer gap-3 rounded-lg border border-stone-200 bg-white p-3">
              <input
                type="radio"
                name="billing_mode"
                value="subscription"
                required
                defaultChecked
                className="mt-1"
              />
              <span>
                <span className="font-medium">Kk-tilaus</span>
                {subscriptionPlanName ? ` (${subscriptionPlanName})` : ""}
                <br />
                <span className="text-stone-500">
                  {subscriptionSlots} ilmoituspaikkaa jäljellä tällä jaksolla
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer gap-3 rounded-lg border border-stone-200 bg-white p-3">
              <input
                type="radio"
                name="billing_mode"
                value="single"
                required
                className="mt-1"
              />
              <span>
                <span className="font-medium">Yksittäinen uusiminen</span>
                <br />
                <span className="text-stone-500">
                  {LISTING_SINGLE.priceLabel} {LISTING_SINGLE.period}
                </span>
              </span>
            </label>
          </div>
        </fieldset>
      )}

      {state.error && (
        <p
          className={`text-sm text-red-700 ${compact ? "max-w-xs text-right text-xs" : ""}`}
          role="alert"
        >
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className={
          compact
            ? "rounded-lg bg-amber-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-60"
            : `${brand.btnPrimary} disabled:opacity-60`
        }
      >
        {pending
          ? "Uusitaan…"
          : singleOnly
            ? `Uusi (${LISTING_SINGLE.priceLabel})`
            : "Uusi voimassaoloa"}
      </button>

      {!compact && singleOnly && (
        <p className="text-xs text-stone-600">
          Lasku lähetetään sähköpostiisi. Ilmoitus palaa torille maksun
          kirjauksen jälkeen.
        </p>
      )}
      {!compact && !isContractor && (
        <p className="text-xs text-stone-600">
          Ilmainen uusiminen — sama ilmoitus näkyy torilla uudelleen 4 viikkoa.
        </p>
      )}
    </form>
  );
}
