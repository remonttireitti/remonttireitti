"use client";

import { useActionState } from "react";
import {
  createConsumerListing,
  type ListingActionState,
} from "@/app/actions/marketplace-listings";
import { brand } from "@/lib/brand-theme";
import { ListingFormFields } from "@/components/marketplace/listing-form-fields";

type Defaults = {
  contact_email: string;
  contact_phone: string;
};

export function ConsumerListingForm({
  defaults,
  slotsLeft,
}: {
  defaults: Defaults;
  slotsLeft: number;
}) {
  const [state, action, pending] = useActionState<
    ListingActionState,
    FormData
  >(createConsumerListing, {});

  if (slotsLeft <= 0) {
    return (
      <p className="mt-6 rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
        Olet käyttänyt molemmat ilmaiset ilmoituspaikat. Poista vanha ilmoitus
        tai odota sen vanhenemista ennen uutta.
      </p>
    );
  }

  return (
    <form action={action} className="mt-6 space-y-4">
      <p className="text-sm text-stone-600">
        Ilmainen julkaisu — {slotsLeft} ilmoituspaikkaa jäljellä (max 2
        aktiivista).
      </p>

      {state.error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">
          {state.error}
        </p>
      )}

      <ListingFormFields defaults={defaults} />

      <button type="submit" disabled={pending} className={`w-full ${brand.btnPrimary}`}>
        {pending ? "Julkaistaan…" : "Julkaise ilmoitus ilmaiseksi"}
      </button>
    </form>
  );
}
