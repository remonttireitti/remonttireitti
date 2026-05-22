"use client";

import { useActionState } from "react";
import {
  updateNotificationPreferences,
  type NotificationPrefsState,
} from "@/app/actions/notification-preferences";
import type { NotificationPrefs } from "@/lib/notification-prefs";
import type { UserRole } from "@/types/database";

export function NotificationPreferencesForm({
  role,
  prefs,
  className = "",
  emailConfigured = true,
}: {
  role: UserRole;
  prefs: NotificationPrefs;
  className?: string;
  /** Tuotannossa: onko Resend (RESEND_API_KEY) asetettu. */
  emailConfigured?: boolean;
}) {
  const [state, action, pending] = useActionState<
    NotificationPrefsState,
    FormData
  >(updateNotificationPreferences, {});

  return (
    <form
      action={action}
      className={`space-y-4 rounded-xl border border-stone-200 bg-white p-4 sm:p-6 ${className || "mt-6"}`}
    >
      <h2 className="text-lg font-semibold">Ilmoitukset</h2>
      <p className="text-sm text-stone-600">
        Valitse miten haluat vastaanottaa ilmoituksia. Voit poistaa ne käytöstä
        milloin tahansa.
      </p>

      {!emailConfigured && role === "admin" && (
        <p
          className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
          role="status"
        >
          Sähköpostilähetys ei ole käytössä palvelimella: aseta Vercelissä{" "}
          <strong>RESEND_API_KEY</strong> ja vahvista lähettäjädomain Resendissä
          (<code className="text-xs">EMAIL_FROM</code>).
        </p>
      )}

      {emailConfigured && !prefs.notifyEmail && (
        <p className="text-sm text-stone-500">
          Sähköposti-ilmoitukset ovat pois päältä — et saa sähköpostia, vaikka
          tapahtuma tapahtuisi.
        </p>
      )}

      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          name="notify_in_app"
          defaultChecked={prefs.notifyInApp}
          className="mt-1"
        />
        <span>
          <span className="font-medium">Sovelluksen ilmoitukset</span>
          <span className="mt-0.5 block text-stone-500">
            Näkyvät etusivulla ja Oma tili -sivulla.
          </span>
        </span>
      </label>

      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          name="notify_email"
          defaultChecked={prefs.notifyEmail}
          className="mt-1"
        />
        <span>
          <span className="font-medium">Sähköposti-ilmoitukset</span>
          <span className="mt-0.5 block text-stone-500">
            Lähetetään kirjautumissähköpostiisi.
          </span>
        </span>
      </label>

      {role === "admin" && (
        <label className="flex items-start gap-3 text-sm border-t border-stone-100 pt-4">
          <input
            type="checkbox"
            name="notify_admin_new_users"
            defaultChecked={prefs.notifyAdminNewUsers}
            className="mt-1"
          />
          <span>
            <span className="font-medium">Uudet käyttäjät ja urakoitsijat</span>
            <span className="mt-0.5 block text-stone-500">
              Ilmoitus kun joku rekisteröityy tai aktivoi urakoitsijatilin.
            </span>
          </span>
        </label>
      )}

      {role === "contractor" && (
        <label className="flex items-start gap-3 text-sm border-t border-stone-100 pt-4">
          <input
            type="checkbox"
            name="notify_new_projects"
            defaultChecked={prefs.notifyNewProjects}
            className="mt-1"
          />
          <span>
            <span className="font-medium">Uudet tarjouspyynnöt</span>
            <span className="mt-0.5 block text-stone-500">
              Vain pyynnöt, jotka vastaavat Oma tili -sivulla valitsemiasi
              lämpöpumppuja (esim. ilma–vesi, maalämpö).
            </span>
          </span>
        </label>
      )}

      {state.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="text-sm text-sky-700" role="status">
          {state.ok}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-800 disabled:opacity-60"
      >
        {pending ? "Tallennetaan…" : "Tallenna ilmoitusasetukset"}
      </button>
    </form>
  );
}
