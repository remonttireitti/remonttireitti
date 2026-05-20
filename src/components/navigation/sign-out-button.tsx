"use client";

import { useFormStatus } from "react-dom";

const idleClass =
  "rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900";

export function SignOutButton({ className = idleClass }: { className?: string }) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? "Kirjaudutaan ulos…" : "Kirjaudu ulos"}
    </button>
  );
}
