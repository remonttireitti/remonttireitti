"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import type { ListingActionState } from "@/app/actions/marketplace-listings";

type ListingAction = (
  prev: ListingActionState,
  formData: FormData,
) => Promise<ListingActionState>;

/** Lähettää ilmoituslomakkeen server actionille ilman useActionState-ongelmia. */
export function useListingFormSubmit(action: ListingAction) {
  const router = useRouter();
  const [state, setState] = useState<ListingActionState>({});
  const [pending, startTransition] = useTransition();

  const submit = useCallback(
    (formData: FormData) => {
      startTransition(async () => {
        try {
          const result = await action({}, formData);
          setState(result);
          if (result.redirectPath) {
            router.push(result.redirectPath);
            router.refresh();
          }
        } catch (err) {
          console.error("[listing-form-submit]", err);
          setState({
            error:
              "Ilmoituksen lähetys epäonnistui. Tarkista tiedot ja yritä uudelleen.",
          });
        }
      });
    },
    [action, router],
  );

  return { state, submit, pending };
}
