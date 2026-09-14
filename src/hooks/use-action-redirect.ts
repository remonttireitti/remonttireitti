"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Seuraa server action -tilan redirectPath-kenttää (useActionState-lomakkeille). */
export function useActionRedirect(state: { redirectPath?: string }) {
  const router = useRouter();

  useEffect(() => {
    if (state.redirectPath) {
      router.push(state.redirectPath);
      router.refresh();
    }
  }, [state.redirectPath, router]);
}
