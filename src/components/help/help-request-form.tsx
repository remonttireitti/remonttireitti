"use client";

import { useActionState } from "react";
import {
  createHelpRequest,
  type HelpActionState,
} from "@/app/actions/help-requests";
import { brand } from "@/lib/brand-theme";
import { HELP_CATEGORIES, HELP_LOCATION_TYPES } from "@/lib/help-categories";

export function HelpRequestForm({
  defaultPostal,
  defaultMunicipality,
}: {
  defaultPostal?: string;
  defaultMunicipality?: string;
}) {
  const [state, action, pending] = useActionState<HelpActionState, FormData>(
    createHelpRequest,
    {},
  );

  const now = new Date();
  const defaultStart = new Date(now.getTime() + 2 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 16);
  const defaultEnd = new Date(now.getTime() + 5 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 16);

  return (
    <form action={action} className={`${brand.section} space-y-5 p-6`}>
      <div>
        <label htmlFor="title" className="block text-sm font-medium">
          Mitä tarvitset?
        </label>
        <input
          id="title"
          name="title"
          required
          minLength={5}
          placeholder="Esim. Tarvitaan kaksi ihmistä kantamaan sohva"
          className={`mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 ${brand.input}`}
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium">
          Lisätiedot
        </label>
        <textarea
          id="description"
          name="description"
          required
          minLength={10}
          rows={4}
          placeholder="Kerro lyhyesti mitä apua tarvitaan ja mitä pitää tehdä."
          className={`mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 ${brand.input}`}
        />
      </div>

      <div>
        <label htmlFor="category" className="block text-sm font-medium">
          Kategoria
        </label>
        <select
          id="category"
          name="category"
          required
          className={`mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 ${brand.input}`}
        >
          <option value="">Valitse…</option>
          {HELP_CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.emoji} {c.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="postal_code" className="block text-sm font-medium">
            Postinumero (alue, ei tarkkaa osoitetta)
          </label>
          <input
            id="postal_code"
            name="postal_code"
            required
            defaultValue={defaultPostal}
            pattern="\d{5}"
            className={`mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 ${brand.input}`}
          />
        </div>
        <div>
          <label htmlFor="municipality" className="block text-sm font-medium">
            Kunta
          </label>
          <input
            id="municipality"
            name="municipality"
            required
            defaultValue={defaultMunicipality}
            className={`mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 ${brand.input}`}
          />
        </div>
      </div>

      <div>
        <p className="text-sm font-medium">Missä apu tapahtuu?</p>
        <p className="mt-1 text-xs text-stone-600">
          Turvallisuuden vuoksi aloitamme ulkona ja yhteisissä tiloissa — ei suoraan
          kotiin tuntemattomien kanssa.
        </p>
        <div className="mt-2 space-y-2">
          {HELP_LOCATION_TYPES.map((loc) => (
            <label key={loc.id} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="location_type"
                value={loc.id}
                required
                defaultChecked={loc.id === "outdoor"}
                className={brand.checkbox}
              />
              {loc.label}
            </label>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="people_needed" className="block text-sm font-medium">
            Montako auttajaa tarvitaan?
          </label>
          <input
            id="people_needed"
            name="people_needed"
            type="number"
            min={1}
            max={10}
            defaultValue={1}
            className={`mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 ${brand.input}`}
          />
        </div>
        <div>
          <p className="text-sm font-medium">Kiire</p>
          <label className="mt-2 flex items-center gap-2 text-sm">
            <input type="checkbox" name="urgency" value="now" className={brand.checkbox} />
            Tarvitsen apua nyt / tänään
          </label>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="window_start" className="block text-sm font-medium">
            Alkaen (valinnainen)
          </label>
          <input
            id="window_start"
            name="window_start"
            type="datetime-local"
            defaultValue={defaultStart}
            className={`mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 ${brand.input}`}
          />
        </div>
        <div>
          <label htmlFor="window_end" className="block text-sm font-medium">
            Viimeistään (valinnainen)
          </label>
          <input
            id="window_end"
            name="window_end"
            type="datetime-local"
            defaultValue={defaultEnd}
            className={`mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 ${brand.input}`}
          />
        </div>
      </div>

      <p className="rounded-xl border border-rose-100 bg-rose-50/80 px-4 py-3 text-sm text-rose-950">
        ❤️ <strong>Vapaaehtoinen apu</strong> — ei hintaa, ei tarjouksia. Kaikesta ei
        tarvitse maksaa; hyvä teko synnyttää hyvää.
      </p>

      {state.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className={brand.btnPrimary}>
        {pending ? "Julkaistaan…" : "Julkaise apupyyntö"}
      </button>
    </form>
  );
}
