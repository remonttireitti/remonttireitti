"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { ListingActionState } from "@/app/actions/marketplace-listings";

export function useListingFormRedirect(state: ListingActionState) {
  const router = useRouter();

  useEffect(() => {
    if (state.ok && state.redirectPath) {
      router.push(state.redirectPath);
    }
  }, [state.ok, state.redirectPath, router]);
}
