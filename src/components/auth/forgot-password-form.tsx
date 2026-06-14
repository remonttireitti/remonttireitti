"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  requestPasswordReset,
  type PasswordResetRequestState,
} from "@/app/actions/auth";

const inputClass =
  "mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-sky-600 focus:outline-none focus:ring-1 focus:ring-sky-600";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState<
    PasswordResetRequestState,
    FormData
  >(requestPasswordReset, {});

  if (state.success) {
    return (
      <div className="space-y-4">
        <p className="rounded-lg bg-sky-50 p-3 text-sm text-sky-900" role="status">
          {state.success}
        </p>
        <p className="text-center text-sm text-stone-600">
          <Link href="/kirjaudu" className="font-medium text-sky-700 hover:underline">
            ← Takaisin kirjautumiseen
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <p className="text-sm leading-relaxed text-stone-600">
        Anna tilisi sähköpostiosoite. Lähetämme linkin, jolla voit asettaa uuden
        salasanan.
      </p>
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
      {state.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-orange-700 py-2.5 font-medium text-white hover:bg-orange-800 disabled:opacity-60"
      >
        {pending ? "Lähetetään…" : "Lähetä palautuslinkki"}
      </button>
      <p className="text-center text-sm text-stone-600">
        <Link href="/kirjaudu" className="font-medium text-sky-700 hover:underline">
          ← Kirjaudu
        </Link>
      </p>
    </form>
  );
}
