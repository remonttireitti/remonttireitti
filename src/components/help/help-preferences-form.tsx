"use client";

import { useActionState, useState } from "react";
import {
  updateHelpPreferences,
  type HelpActionState,
} from "@/app/actions/help-requests";
import { SettingToggle } from "@/components/ui/setting-toggle";
import { brand } from "@/lib/brand-theme";
import type { HelpPrefs } from "@/lib/help-requests-server";

export function HelpPreferencesForm({
  prefs,
  className = "",
}: {
  prefs: HelpPrefs;
  className?: string;
}) {
  const [notifyNearby, setNotifyNearby] = useState(prefs.notifyNearbyHelp);
  const [offerVoluntary, setOfferVoluntary] = useState(prefs.offerVoluntaryHelp);

  const [state, action, pending] = useActionState<HelpActionState, FormData>(
    updateHelpPreferences,
    {},
  );

  return (
    <form action={action} className={`${brand.section} p-5 sm:p-6 ${className}`}>
      <h2 className={brand.sectionTitle}>Pieni apu — alue ja ilmoitukset</h2>
      <p className={`${brand.sectionDesc} mt-1`}>
        Aseta alueesi nähdäksesi lähellä olevat apupyynnöt ja saadaksesi ilmoituksen,
        kun naapurustossa tarvitaan apua. Yritykset voivat auttaa vapaaehtoisesti
        samalla tavalla.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="help_postal_code" className="block text-sm font-medium">
            Postinumero
          </label>
          <input
            id="help_postal_code"
            name="help_postal_code"
            required
            defaultValue={prefs.helpPostalCode ?? ""}
            pattern="\d{5}"
            className={`mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 ${brand.input}`}
          />
        </div>
        <div>
          <label htmlFor="help_municipality" className="block text-sm font-medium">
            Kunta
          </label>
          <input
            id="help_municipality"
            name="help_municipality"
            required
            defaultValue={prefs.helpMunicipality ?? ""}
            className={`mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 ${brand.input}`}
          />
        </div>
      </div>

      <div className="mt-4">
        <label htmlFor="help_radius_km" className="block text-sm font-medium">
          Ilmoitussäde (km)
        </label>
        <input
          id="help_radius_km"
          name="help_radius_km"
          type="number"
          min={1}
          max={50}
          defaultValue={prefs.helpRadiusKm}
          className={`mt-1 w-32 rounded-xl border border-stone-300 px-3 py-2 ${brand.input}`}
        />
      </div>

      <div className="mt-4 divide-y divide-stone-100">
        <SettingToggle
          name="notify_nearby_help"
          checked={notifyNearby}
          onChange={setNotifyNearby}
          label="Ilmoita kun lähellä tarvitaan apua"
          description="Saat ilmoituksen, kun joku julkaisee vapaaehtoisen apupyynnön alueellasi."
        />
        <SettingToggle
          name="offer_voluntary_help"
          checked={offerVoluntary}
          onChange={setOfferVoluntary}
          label="Haluan auttaa lähialueella"
          description="Näytetään profiilissasi — voit tarjota apua avoimiin pyyntöihin."
        />
      </div>

      {prefs.freeHelpsGiven > 0 && (
        <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          ❤️ Olet auttanut {prefs.freeHelpsGiven}{" "}
          {prefs.freeHelpsGiven === 1 ? "kerran" : "kertaa"} ilmaiseksi. Kiitos kun
          autoit muita.
        </p>
      )}

      {state.error && (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {state.ok}
        </p>
      )}

      <button type="submit" disabled={pending} className={`${brand.btnPrimary} mt-5`}>
        {pending ? "Tallennetaan…" : "Tallenna apu-asetukset"}
      </button>
    </form>
  );
}
