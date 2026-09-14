"use client";

import { useState } from "react";
import { signUp, type AuthState } from "@/app/actions/auth";
import { useServerActionSubmit } from "@/hooks/use-server-action-submit";
import { ContractorCompanyFactsFields } from "@/components/contractor/contractor-company-facts-fields";
import { ContractorQualificationFields } from "@/components/contractor/qualification-fields";
import type { SelectableTrade } from "@/lib/contractor-trade-options";
import type { JobType } from "@/types/job-catalog";
import Link from "next/link";

const inputClass =
  "mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-sky-600 focus:outline-none focus:ring-1 focus:ring-sky-600";

export function RegisterForm({
  defaultRole,
  defaultEmail = "",
  trades = [],
  heatPumpJobTypes = [],
}: {
  defaultRole?: "customer" | "contractor";
  defaultEmail?: string;
  trades?: SelectableTrade[];
  heatPumpJobTypes?: Pick<JobType, "id" | "slug">[];
}) {
  const [role, setRole] = useState<"customer" | "contractor">(
    defaultRole ?? "customer",
  );
  const { state, submit, pending } = useServerActionSubmit<AuthState>(signUp);

  return (
    <form action={submit} className="space-y-4">
      <input type="hidden" name="role" value={role} />
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Olen</legend>
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-stone-200 p-3 has-checked:border-sky-600 has-checked:bg-sky-50">
          <input
            type="radio"
            value="customer"
            checked={role === "customer"}
            onChange={() => setRole("customer")}
          />
          <span>Asiakas — etsin urakoitsijaa</span>
        </label>
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-stone-200 p-3 has-checked:border-sky-600 has-checked:bg-sky-50">
          <input
            type="radio"
            value="contractor"
            checked={role === "contractor"}
            onChange={() => setRole("contractor")}
          />
          <span>Urakoitsija — haen töitä</span>
        </label>
      </fieldset>

      <div>
        <label htmlFor="full_name" className="block text-sm font-medium">
          Nimi
        </label>
        <input
          id="full_name"
          name="full_name"
          type="text"
          autoComplete="name"
          className={inputClass}
        />
      </div>

      {role === "contractor" && (
        <>
          <div>
            <label htmlFor="company_name" className="block text-sm font-medium">
              Yrityksen nimi
            </label>
            <input
              id="company_name"
              name="company_name"
              type="text"
              required
              className={inputClass}
            />
          </div>
          <ContractorCompanyFactsFields required inputClassName={inputClass} />
          {trades.length > 0 && (
            <ContractorQualificationFields
              trades={trades}
              jobTypes={heatPumpJobTypes}
            />
          )}
        </>
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
          defaultValue={defaultEmail}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium">
          Salasana (väh. 8 merkkiä)
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

      {state.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}

      <p className="text-xs text-stone-500">
        Luomalla tilin hyväksyt{" "}
        <Link href="/kayttoehdot" className="text-sky-700 hover:underline">
          käyttöehdot
        </Link>{" "}
        ja{" "}
        <Link href="/tietosuoja" className="text-sky-700 hover:underline">
          tietosuojaselosteen
        </Link>
        .
      </p>

      <button
        type="submit"
        disabled={pending}
        className="touch-target w-full min-h-[2.75rem] rounded-lg bg-orange-700 py-2.5 font-medium text-white hover:bg-orange-800 disabled:opacity-60"
      >
        {pending ? "Luodaan tiliä…" : "Luo tili"}
      </button>

      <p className="text-center text-sm text-stone-600">
        Onko sinulla jo tili?{" "}
        <Link href="/kirjaudu" className="font-medium text-sky-700">
          Kirjaudu
        </Link>
      </p>
    </form>
  );
}
