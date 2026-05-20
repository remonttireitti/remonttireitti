"use client";

import { useLinkStatus } from "next/link";
import type { ReactNode } from "react";

function NavSpinner({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block size-3 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent opacity-80 ${className}`}
      aria-hidden
    />
  );
}

/** Näytä spinner + himmennys Linkin lapsena (useLinkStatus). */
export function NavLinkPendingContent({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const { pending } = useLinkStatus();

  return (
    <span
      className={`inline-flex items-center gap-1.5 transition-opacity duration-150 ${
        pending ? "opacity-65" : ""
      } ${className}`}
    >
      {pending ? <NavSpinner /> : null}
      {children}
    </span>
  );
}
