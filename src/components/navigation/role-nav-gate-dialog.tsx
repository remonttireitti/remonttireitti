"use client";

import { useEffect, useRef } from "react";
import { signOutToLogin } from "@/app/actions/auth";
import { useRoleNav } from "@/components/navigation/role-nav-context";
import Link from "next/link";

export function RoleNavGateDialog() {
  const { gate, closeGate } = useRoleNav();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (gate) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [gate]);

  if (!gate) return null;

  const isCustomerSection = gate.audience === "customer";
  const title = isCustomerSection ? "Asiakkaan osio" : "Urakoitsijan osio";
  const body = isCustomerSection
    ? "Tämä osio on tarkoitettu asiakkaille. Jos haluat käyttää tätä toimintoa, kirjaudu asiakastilillä."
    : "Tämä osio on tarkoitettu urakoitsijoille. Jos haluat käyttää tätä toimintoa, kirjaudu urakoitsijatilillä.";
  const loginLabel = isCustomerSection
    ? "Kirjaudu ulos ja jatka asiakkaana"
    : "Kirjaudu ulos ja jatka urakoitsijana";
  const registerHref = isCustomerSection
    ? `/rekisteroidy?redirect=${encodeURIComponent(gate.href)}`
    : `/rekisteroidy?rooli=urakoitsija&redirect=${encodeURIComponent(gate.href)}`;
  const registerLabel = isCustomerSection
    ? "Rekisteröidy asiakkaaksi"
    : "Rekisteröidy urakoitsijaksi";

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-[70] m-auto w-[min(100%-2rem,28rem)] max-h-[calc(100%-2rem)] rounded-2xl border border-stone-200 bg-white p-0 shadow-xl backdrop:bg-stone-900/50 open:flex open:flex-col"
      onClose={closeGate}
      onCancel={closeGate}
    >
      <div className="border-b border-stone-100 px-5 py-4">
        <h2 className="text-lg font-semibold text-stone-900">{title}</h2>
      </div>
      <div className="px-5 py-4">
        <p className="text-sm leading-relaxed text-stone-700">{body}</p>
        <p className="mt-3 text-sm text-stone-600">
          Voit kirjautua ulos nykyiseltä tililtä ja kirjautua uudelleen toisella
          roolilla, tai luoda erillisen tilin.
        </p>
      </div>
      <div className="flex flex-col gap-2 border-t border-stone-100 px-5 py-4 sm:flex-row sm:flex-wrap sm:justify-end">
        <button
          ref={cancelRef}
          type="button"
          className="rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
          onClick={closeGate}
        >
          Peruuta
        </button>
        <Link
          href={registerHref}
          className="rounded-xl border border-stone-200 px-4 py-2.5 text-center text-sm font-medium text-stone-800 hover:bg-stone-50"
          onClick={closeGate}
        >
          {registerLabel}
        </Link>
        <form action={signOutToLogin.bind(null, gate.href)}>
          <button
            type="submit"
            className="w-full rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-800 sm:w-auto"
          >
            {loginLabel}
          </button>
        </form>
      </div>
    </dialog>
  );
}
