"use client";

import { useActionState, useState } from "react";
import {
  updateNotificationPreferences,
  type NotificationPrefsState,
} from "@/app/actions/notification-preferences";
import { SettingToggle } from "@/components/ui/setting-toggle";
import { brand } from "@/lib/brand-theme";
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
  emailConfigured?: boolean;
}) {
  const [notifyInApp, setNotifyInApp] = useState(prefs.notifyInApp);
  const [notifyEmail, setNotifyEmail] = useState(prefs.notifyEmail);
  const [notifyAdminNewUsers, setNotifyAdminNewUsers] = useState(
    prefs.notifyAdminNewUsers,
  );
  const [notifyNewProjects, setNotifyNewProjects] = useState(
    prefs.notifyNewProjects,
  );

  const [state, action, pending] = useActionState<
    NotificationPrefsState,
    FormData
  >(updateNotificationPreferences, {});

  return (
    <form action={action} className={`${brand.section} p-5 sm:p-6 ${className}`}>
      <h2 className={brand.sectionTitle}>Ilmoitukset</h2>
      <p className={`${brand.sectionDesc} mt-1`}>
        Valitse miten haluat vastaanottaa ilmoituksia. Voit muuttaa asetuksia
        milloin tahansa.
      </p>

      {!emailConfigured && role === "admin" && (
        <p
          className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
          role="status"
        >
          Sähköpostilähetys ei ole käytössä palvelimella: aseta Vercelissä{" "}
          <strong>RESEND_API_KEY</strong> ja vahvista lähettäjädomain Resendissä
          (<code className="text-xs">EMAIL_FROM</code>).
        </p>
      )}

      <div className="mt-4 divide-y divide-stone-100">
        <SettingToggle
          name="notify_in_app"
          checked={notifyInApp}
          onChange={setNotifyInApp}
          label="Sovelluksen ilmoitukset"
          description="Näkyvät etusivulla ja Oma tili -sivulla."
        />

        <SettingToggle
          name="notify_email"
          checked={notifyEmail}
          onChange={setNotifyEmail}
          label="Sähköposti-ilmoitukset"
          description="Lähetetään kirjautumissähköpostiisi."
        />

        {role === "admin" && (
          <SettingToggle
            name="notify_admin_new_users"
            checked={notifyAdminNewUsers}
            onChange={setNotifyAdminNewUsers}
            label="Uudet käyttäjät ja urakoitsijat"
            description="Ilmoitus kun joku rekisteröityy tai aktivoi urakoitsijatilin."
          />
        )}

        {role === "contractor" && (
          <SettingToggle
            name="notify_new_projects"
            checked={notifyNewProjects}
            onChange={setNotifyNewProjects}
            label="Uudet tarjouspyynnöt"
            description="Pyynnöt, jotka vastaavat profiilissasi valitsemiasi töitä ja ammatteja."
          />
        )}
      </div>

      {emailConfigured && !notifyEmail && (
        <p className="mt-3 text-xs text-stone-500">
          Sähköposti on pois päältä — et saa viestejä sähköpostiisi.
        </p>
      )}

      {state.error && (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p
          className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
          role="status"
        >
          {state.ok}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className={`${brand.btnPrimary} mt-5 w-full sm:w-auto`}
      >
        {pending ? "Tallennetaan…" : "Tallenna asetukset"}
      </button>
    </form>
  );
}
