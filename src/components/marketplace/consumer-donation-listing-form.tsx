"use client";

import { useState } from "react";
import { useListingFormSubmit } from "@/components/marketplace/use-listing-form-submit";
import { ListingPhotoField } from "@/components/marketplace/listing-photo-field";
import { createConsumerDonationListing } from "@/app/actions/listing-donations";
import { brand } from "@/lib/brand-theme";
import { ListingFormFields } from "@/components/marketplace/listing-form-fields";
import { DONATION_MAX_ACTIVE_LISTINGS } from "@/lib/marketplace-donations";

type Defaults = {
  contact_email: string;
  contact_phone: string;
};

export function ConsumerDonationListingForm({
  defaults,
  slotsLeft,
  isGuest = false,
}: {
  defaults: Defaults;
  slotsLeft: number;
  isGuest?: boolean;
}) {
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const { state, submit, pending } = useListingFormSubmit(createConsumerDonationListing);

  if (slotsLeft <= 0) {
    return (
      <p className="mt-6 rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
        Olet käyttänyt molemmat lahjoitusilmoituspaikat. Poista vanha ilmoitus
        tai odota sen vanhenemista ennen uutta.
      </p>
    );
  }

  return (
    <form
      encType="multipart/form-data"
      onSubmit={(e) => {
        e.preventDefault();
        submit(new FormData(e.currentTarget));
      }}
      className="mt-6 space-y-4"
    >
      <input type="hidden" name="listing_kind" value="donate" />
      <input type="hidden" name="price_eur" value="0" />
      <p className="text-sm text-stone-600">
        {isGuest
          ? "Ilmainen lahjoitus ilman tiliä — vahvistuslinkki sähköpostiisi."
          : `Ilmainen lahjoitus — ${slotsLeft} paikkaa jäljellä`}{" "}
        (max {DONATION_MAX_ACTIVE_LISTINGS} aktiivista lahjoitusilmoitusta).
      </p>

      {state.error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">
          {state.error}
        </p>
      )}

      <ListingFormFields defaults={defaults} donationMode />

      <ListingPhotoField files={photoFiles} onFilesChange={setPhotoFiles} />

      <button type="submit" disabled={pending} className={`w-full ${brand.btnPrimary}`}>
        {pending ? "Lähetetään…" : "Lähetä vahvistuslinkki"}
      </button>
    </form>
  );
}
