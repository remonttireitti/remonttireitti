"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import type { ListingActionState } from "@/app/actions/marketplace-listings";
import {
  listingFormDataWithoutPhotos,
  uploadListingPhotosClient,
} from "@/lib/listing-photos-client";

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
    (formData: FormData, photoFiles: File[] = []) => {
      const fieldsOnly = listingFormDataWithoutPhotos(formData);

      startTransition(() => {
        void (async () => {
          try {
            const result = await action({}, fieldsOnly);

            if (result.listingId && photoFiles.length > 0) {
              const upload = await uploadListingPhotosClient(
                result.listingId,
                photoFiles,
              );
              if (!upload.ok) {
                const redirectPath = result.redirectPath
                  ? `${result.redirectPath}${result.redirectPath.includes("?") ? "&" : "?"}kuvat=epaonnistui`
                  : undefined;
                setState({
                  ...result,
                  error: upload.error,
                  photoWarning: upload.error,
                  redirectPath,
                });
                if (redirectPath) {
                  router.push(redirectPath);
                  router.refresh();
                }
                return;
              }
            }

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
        })();
      });
    },
    [action, router],
  );

  return { state, submit, pending };
}
