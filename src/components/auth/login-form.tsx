"use client";

import { useActionState } from "react";
import { signIn, type AuthState } from "@/app/actions/auth";
import Link from "next/link";

const inputClass =
  "mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-sky-600 focus:outline-none focus:ring-1 focus:ring-sky-600";

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    signIn,
    {},
  );

  return (
    <form action={action} className="space-y-4">
      {redirectTo && (
        <input type="hidden" name="redirect" value={redirectTo} />
      )}
      <div>
        <label htmlFor="email" className="block text-sm font-medium">
          Sähköposti
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium">
          Salasana
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className={inputClass}
        />
      </div>
      {state.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-orange-600 py-2.5 font-medium text-white hover:bg-orange-700 disabled:opacity-60"
      >
        {pending ? "Kirjaudutaan…" : "Kirjaudu"}
      </button>
      <p className="text-center text-sm text-stone-600">
        Ei tiliä?{" "}
        <Link href="/rekisteroidy" className="font-medium text-sky-700">
          Rekisteröidy
        </Link>
      </p>
    </form>
  );
}
