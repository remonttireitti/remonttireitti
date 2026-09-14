"use client";

import type { ListingActionState } from "@/app/actions/marketplace-listings";
import { useActionRedirect } from "@/hooks/use-action-redirect";

export function useListingFormRedirect(state: ListingActionState) {
  useActionRedirect(state);
}
