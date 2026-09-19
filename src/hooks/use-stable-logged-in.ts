"use client";

import { useEffect, useState } from "react";
import {
  forgetLoggedIn,
  hadLoggedInHint,
  rememberLoggedIn,
} from "@/lib/auth-client-state";

/**
 * Keep showing the authenticated shell while the server briefly reports
 * logged-out during cookie/session revalidation. Clear only after a short
 * confirmed signed-out window (or explicit forgetLoggedIn on sign-out).
 */
export function useStableLoggedIn(loggedIn: boolean): boolean {
  const [stable, setStable] = useState(() => loggedIn || hadLoggedInHint());

  useEffect(() => {
    if (loggedIn) {
      rememberLoggedIn();
      setStable(true);
      return;
    }

    // Server says signed out — wait briefly in case this is a revalidation race.
    const t = window.setTimeout(() => {
      if (!hadLoggedInHint()) {
        setStable(false);
        return;
      }
      // Hint still set but server keeps saying false → trust server after grace.
      forgetLoggedIn();
      setStable(false);
    }, 800);

    return () => window.clearTimeout(t);
  }, [loggedIn]);

  return loggedIn || stable;
}
