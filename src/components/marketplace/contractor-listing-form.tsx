"use client";

import { useActionState } from "react";
import {
  createContractorListing,
  type ListingActionState,
} from "@/app/actions/marketplace-listings";
import { brand, formInputClass } from "@/lib/brand-theme";
import { PUMP_TYPE_OPTIONS } from "@/lib/marketplace-listings";
import { LISTING_SINGLE } from "@/lib/marketplace-pricing";
import { ListingFormFields } from "@/components/marketplace/listing-form-fields";

type Defaults = {
  contact_email: string;
  contact_phone: string;
};

export function ContractorListingForm({
  defaults,
  subscriptionSlots,
  subscriptionPlanName,
}: {
  defaults: Defaults;
  subscriptionSlots: number;
  subscriptionPlanName: string | null;
}) {
  const [state, action, pending] = useActionState<
    ListingActionState,
    FormData
  >(createContractorListing, {});

  const canUseSubscription = subscriptionSlots > 0;

  return (
    <form action={action} className="mt-6 space-y-4">
      {state.error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">
          {state.error}
        </p>
      )}

      <fieldset className="rounded-xl border border-stone-200 bg-stone-50/80 p-4">
        <legend className="text-sm font-semibold text-stone-800">
          Julkaisutapa *
        </legend>
        <div className="mt-3 space-y-2 text-sm">
          <label
            className={`flex cursor-pointer gap-3 rounded-lg border bg-white p-3 ${
              canUseSubscription ? "border-stone-200" : "border-stone-100 opacity-60"
            }`}
          >
            <input
              type="radio"
              name="billing_mode"
              value="subscription"
              required
              defaultChecked={canUseSubscription}
              disabled={!canUseSubscription}
              className="mt-1"
            />
            <span>
              <span className="font-medium">Kk-tilaus</span>
              {subscriptionPlanName ? ` (${subscriptionPlanName})` : ""}
              <br />
              <span className="text-stone-500">
                {canUseSubscription
                  ? `${subscriptionSlots} ilmoituspaikkaa jäljellä tällä jaksolla`
                  : "Ei aktiivista tilausta tai kiintiö täynnä"}
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer gap-3 rounded-lg border border-stone-200 bg-white p-3">
            <input
              type="radio"
              name="billing_mode"
              value="single"
              required
              defaultChecked={!canUseSubscription}
              className="mt-1"
            />
            <span>
              <span className="font-medium">Yksittäinen ilmoitus</span>
              <br />
              <span className="text-stone-500">
                {LISTING_SINGLE.priceLabel} {LISTING_SINGLE.period} — julkaistaan
                maksun jälkeen
              </span>
            </span>
          </label>
        </div>
      </fieldset>

      <ListingFormFields defaults={defaults} />

      <button type="submit" disabled={pending} className={`w-full ${brand.btnPrimary}`}>
        {pending ? "Tallennetaan…" : "Lähetä ilmoitus"}
      </button>
    </form>
  );
}
