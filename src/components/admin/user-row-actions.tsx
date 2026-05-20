"use client";

import { useActionState } from "react";
import {
  deleteUser,
  fixAsContractor,
  setUserRole,
  type AdminState,
} from "@/app/actions/admin";

export function UserRowActions({
  userId,
  email,
  currentRole,
  companyName,
}: {
  userId: string;
  email: string;
  currentRole: string;
  companyName: string | null;
}) {
  const [roleState, setRoleAction, rolePending] = useActionState<
    AdminState,
    FormData
  >(setUserRole, {});
  const [fixState, fixAction, fixPending] = useActionState<
    AdminState,
    FormData
  >(fixAsContractor, {});
  const [delState, delAction, delPending] = useActionState<
    AdminState,
    FormData
  >(deleteUser, {});

  const msg = roleState.ok || fixState.ok || delState.ok;
  const err = roleState.error || fixState.error || delState.error;

  return (
    <div className="flex flex-col gap-2 border-t border-stone-100 pt-3 mt-3">
      <form action={setRoleAction} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="user_id" value={userId} />
        <label className="text-xs text-stone-500">
          Rooli
          <select
            name="role"
            defaultValue={currentRole}
            className="ml-1 rounded border border-stone-300 px-2 py-1 text-sm"
          >
            <option value="customer">customer</option>
            <option value="contractor">contractor</option>
            <option value="admin">admin</option>
          </select>
        </label>
        <input
          name="company_name"
          placeholder="Yritys (urakoitsija)"
          defaultValue={companyName ?? ""}
          className="rounded border border-stone-300 px-2 py-1 text-sm"
        />
        <button
          type="submit"
          disabled={rolePending}
          className="rounded bg-stone-800 px-3 py-1 text-xs text-white disabled:opacity-50"
        >
          Tallenna rooli
        </button>
      </form>

      <form action={fixAction} className="flex flex-wrap gap-2">
        <input type="hidden" name="user_id" value={userId} />
        <input
          name="company_name"
          placeholder="Yrityksen nimi"
          defaultValue={companyName ?? ""}
          className="rounded border border-stone-300 px-2 py-1 text-sm"
        />
        <button
          type="submit"
          disabled={fixPending}
          className="rounded bg-orange-700 px-3 py-1 text-xs text-white disabled:opacity-50"
        >
          Korjaa urakoitsijaksi
        </button>
      </form>

      <form
        action={delAction}
        onSubmit={(e) => {
          if (
            !confirm(
              `Poistetaanko käyttäjä ${email}? Tätä ei voi perua.`,
            )
          ) {
            e.preventDefault();
          }
        }}
      >
        <input type="hidden" name="user_id" value={userId} />
        <button
          type="submit"
          disabled={delPending}
          className="rounded bg-red-600 px-3 py-1 text-xs text-white disabled:opacity-50"
        >
          Poista käyttäjä
        </button>
      </form>

      {msg && <p className="text-xs text-sky-700">{msg}</p>}
      {err && <p className="text-xs text-red-600">{err}</p>}
    </div>
  );
}
