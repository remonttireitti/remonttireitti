"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { rememberLoggedIn } from "@/lib/auth-client-state";

/**
 * If the user already has a valid session (e.g. false redirect during refresh),
 * show a neutral loading state and continue — never flash "Kirjaudutaan…".
 */
export function LoginSessionResume({
  redirectTo,
  children,
}: {
  redirectTo?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<"checking" | "resume" | "ready">(
    "checking",
  );

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;

      if (user) {
        rememberLoggedIn();
        setPhase("resume");
        const target =
          redirectTo && redirectTo.startsWith("/") ? redirectTo : "/oma-tili";
        router.replace(target);
        router.refresh();
        return;
      }
      setPhase("ready");
    })();

    return () => {
      cancelled = true;
    };
  }, [redirectTo, router]);

  if (phase === "checking" || phase === "resume") {
    return (
      <p
        className="rounded-lg bg-stone-100 p-3 text-sm text-stone-700"
        role="status"
        aria-live="polite"
      >
        Ladataan…
      </p>
    );
  }

  return <>{children}</>;
}
