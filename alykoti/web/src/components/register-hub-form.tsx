"use client";

import { useActionState } from "react";
import { registerHub } from "@/app/actions/hubs";

const initial = { error: "", ok: "", deviceToken: "" };

export function RegisterHubForm({ disabled = false }: { disabled?: boolean }) {
  const [state, action, pending] = useActionState(registerHub, initial);

  return (
    <form action={action} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <h2 className="font-semibold text-stone-900">Lisää keskusyksikkö</h2>
      <p className="mt-1 text-sm text-stone-600">
        Guition ESP32-P4. Kopioi laiteavain firmwareen (secrets.yaml).
      </p>
      <input
        name="name"
        required
        placeholder="Esim. Olohuone"
        className="mt-4 w-full rounded-lg border border-stone-200 px-3 py-2"
      />
      <button
        type="submit"
        disabled={pending || disabled}
        className="mt-3 rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {pending ? "Luodaan…" : "Luo keskusyksikkö"}
      </button>
      {state.error && <p className="mt-3 text-sm text-red-700">{state.error}</p>}
      {state.ok && (
        <div className="mt-3 rounded-lg bg-sky-50 p-3 text-sm text-sky-950">
          <p>{state.ok}</p>
          {state.deviceToken && (
            <p className="mt-2 break-all font-mono text-xs">device_token: {state.deviceToken}</p>
          )}
        </div>
      )}
    </form>
  );
}

/** @deprecated Käytä RegisterHubForm */
export const RegisterForm = RegisterHubForm;
