"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";

export type ActionStateWithRedirect = {
  error?: string;
  success?: string;
  ok?: boolean | string;
  redirectPath?: string;
};

type ServerAction<TState extends ActionStateWithRedirect> = (
  prev: TState,
  formData: FormData,
) => Promise<TState>;

/**
 * Lähettää lomakkeen server actionille ilman useActionState + redirect()-ongelmia.
 * Server action palauttaa { redirectPath } onnistuneessa uudelleenohjauksessa.
 */
export function useServerActionSubmit<TState extends ActionStateWithRedirect>(
  action: ServerAction<TState>,
  initialState: TState = {} as TState,
) {
  const router = useRouter();
  const [state, setState] = useState<TState>(initialState);
  const [pending, startTransition] = useTransition();

  const submit = useCallback(
    (formData: FormData) => {
      startTransition(async () => {
        try {
          const result = await action({} as TState, formData);
          setState(result);
          if (result.redirectPath) {
            router.push(result.redirectPath);
            router.refresh();
          }
        } catch (err) {
          console.error("[server-action-submit]", err);
          setState({
            error: "Toiminto epäonnistui. Yritä uudelleen.",
          } as TState);
        }
      });
    },
    [action, router],
  );

  return { state, submit, pending };
}
