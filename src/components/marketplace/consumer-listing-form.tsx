"use client";

import { useState } from "react";
import { useListingFormSubmit } from "@/components/marketplace/use-listing-form-submit";
import { ListingPhotoField } from "@/components/marketplace/listing-photo-field";
import { createConsumerListing } from "@/app/actions/marketplace-listings";
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
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const { state, submit, pending } = useListingFormSubmit(createConsumerListing);

  if (slotsLeft <= 0) {
    return (
      <p className="mt-6 rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
        Olet käyttänyt molemmat ilmaiset ilmoituspaikat. Poista vanha ilmoitus
        tai odota sen vanhenemista ennen uutta.
      </p>
    );
  }

  return (
    <form
      encType="multipart/form-data"
      onSubmit={(e) => {
        e.preventDefault();
        submit(new FormData(e.currentTarget), photoFiles);
      }}
      className="mt-6 space-y-4"
    >
      <input type="hidden" name="listing_kind" value="sell" />
      <p className="text-sm text-stone-600">
        Ilmainen julkaisu — {slotsLeft} ilmoituspaikkaa jäljellä (max 2
        aktiivista ilmoitusta per sähköpostiosoite).
      </p>

      {state.error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">
          {state.error}
        </p>
      )}

      <ListingFormFields defaults={defaults} />

      <ListingPhotoField files={photoFiles} onFilesChange={setPhotoFiles} />

      <button type="submit" disabled={pending} className={`w-full ${brand.btnPrimary}`}>
        {pending ? "Lähetetään…" : "Lähetä vahvistuslinkki"}
      </button>
    </form>
  );
}
