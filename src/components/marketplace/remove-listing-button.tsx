"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  removeSellerListing,
  type ListingActionState,
} from "@/app/actions/marketplace-listings";

export function RemoveListingButton({
  listingId,
  title,
  redirectTo,
}: {
  listingId: string;
  title: string;
  /** Oletus: pysy samalla sivulla */
  redirectTo?: string;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<
    ListingActionState,
    FormData
  >(removeSellerListing, {});

  useEffect(() => {
    if (state.success) {
      if (redirectTo) {
        router.push(redirectTo);
      } else {
        router.refresh();
      }
    }
  }, [state.success, redirectTo, router]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (
      !confirm(
        `Poistetaanko ilmoitus "${title}"?\n\nIlmoitus katoaa torilta heti. Tätä ei voi perua.`,
      )
    ) {
      e.preventDefault();
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <form action={action} onSubmit={handleSubmit}>
        <input type="hidden" name="listing_id" value={listingId} />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
        >
          {pending ? "Poistetaan…" : "Poista ilmoitus"}
        </button>
      </form>
      {state.error && (
        <p className="text-xs text-red-600" role="alert">
          {state.error}
        </p>
      )}
      {state.success && !redirectTo && (
        <p className="text-xs text-sky-700" role="status">
          {state.success}
        </p>
      )}
    </div>
  );
}
