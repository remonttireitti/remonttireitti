"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  updatePasswordAfterRecovery,
  type UpdatePasswordState,
} from "@/app/actions/auth";

const inputClass =
  "mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-sky-600 focus:outline-none focus:ring-1 focus:ring-sky-600";

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState<UpdatePasswordState, FormData>(
    updatePasswordAfterRecovery,
    {},
  );

  return (
    <form action={action} className="space-y-4">
      <p className="text-sm leading-relaxed text-stone-600">
        Valitse uusi salasana (vähintään 8 merkkiä).
      </p>
      <div>
        <label htmlFor="password" className="block text-sm font-medium">
          Uusi salasana
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="password_confirm" className="block text-sm font-medium">
          Vahvista salasana
        </label>
        <input
          id="password_confirm"
          name="password_confirm"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
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
        {pending ? "Tallennetaan…" : "Vaihda salasana"}
      </button>
      <p className="text-center text-sm text-stone-600">
        <Link
          href="/kirjaudu/unohdin-salasanan"
          className="font-medium text-sky-700 hover:underline"
        >
          Pyydä uusi linkki
        </Link>
      </p>
    </form>
  );
}
