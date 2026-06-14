"use client";

import { useActionState, useState } from "react";
import {
  createProperty,
  deleteProperty,
  updateProperty,
  type PropertyActionState,
} from "@/app/actions/property-log";
import { brand, formInputClass } from "@/lib/brand-theme";
import {
  FIREPLACE_TYPE_LABELS,
  FIREPLACE_TYPES,
  HEATING_TYPE_LABELS,
  HEATING_TYPES,
  PROPERTY_BUILDING_TYPE_LABELS,
  PROPERTY_BUILDING_TYPES,
  SAUNA_HEATER_LABELS,
  SAUNA_HEATER_TYPES,
  VENTILATION_TYPE_LABELS,
  VENTILATION_TYPES,
  type PropertyProfile,
} from "@/lib/property-profile";

const fieldsetClass =
  "space-y-4 rounded-xl border border-stone-200 bg-stone-50/50 p-4 sm:p-5";
const legendClass = "text-sm font-semibold text-stone-800";
const labelClass = "block text-sm font-medium text-stone-800";
const hintClass = "mt-1 text-xs text-stone-500";

type Props = {
  mode: "create" | "edit";
  property?: PropertyProfile;
  showDelete?: boolean;
};

export function PropertyForm({ mode, property, showDelete = false }: Props) {
  const actionFn = mode === "create" ? createProperty : updateProperty;
  const [state, action, pending] = useActionState<PropertyActionState, FormData>(
    actionFn,
    {},
  );
  const [deleteState, deleteAction, deletePending] = useActionState<
    PropertyActionState,
    FormData
  >(deleteProperty, {});

  const d = property?.details ?? {};
  const [hasSauna, setHasSauna] = useState(
    property?.details.sauna?.has_sauna !== false &&
      property?.details.sauna?.heater_type !== "ei",
  );

  return (
    <div className="space-y-6">
      <form action={action} className={`${brand.section} space-y-6 p-5 sm:p-6`}>
        {mode === "edit" && property && (
          <input type="hidden" name="property_id" value={property.id} />
        )}

        <fieldset className={fieldsetClass}>
          <legend className={legendClass}>Perustiedot</legend>

          <div>
            <label htmlFor="label" className={labelClass}>
              Kiinteistön nimi (valinnainen)
            </label>
            <input
              id="label"
              name="label"
              type="text"
              defaultValue={property?.label ?? ""}
              placeholder="Esim. Kotitalo, Mökki Rannalla"
              className={formInputClass}
            />
            <p className={hintClass}>
              Helpottaa tunnistamista, jos sinulla on useita kohteita.
            </p>
          </div>

          <div>
            <label htmlFor="address_line" className={labelClass}>
              Katuosoite
            </label>
            <input
              id="address_line"
              name="address_line"
              type="text"
              defaultValue={property?.address_line ?? ""}
              placeholder="Esimerkkitie 1 A 2"
              className={formInputClass}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="postal_code" className={labelClass}>
                Postinumero *
              </label>
              <input
                id="postal_code"
                name="postal_code"
                type="text"
                inputMode="numeric"
                pattern="\d{5}"
                maxLength={5}
                required
                defaultValue={property?.postal_code ?? ""}
                className={formInputClass}
              />
            </div>
            <div>
              <label htmlFor="municipality" className={labelClass}>
                Kunta *
              </label>
              <input
                id="municipality"
                name="municipality"
                type="text"
                required
                defaultValue={property?.municipality ?? ""}
                className={formInputClass}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="property_type" className={labelClass}>
                Rakennustyyppi
              </label>
              <select
                id="property_type"
                name="property_type"
                defaultValue={property?.property_type ?? ""}
                className={formInputClass}
              >
                <option value="">Valitse…</option>
                {PROPERTY_BUILDING_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {PROPERTY_BUILDING_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="built_year" className={labelClass}>
                Rakennusvuosi
              </label>
              <input
                id="built_year"
                name="built_year"
                type="number"
                min={1800}
                max={2100}
                defaultValue={property?.built_year ?? ""}
                placeholder="1985"
                className={formInputClass}
              />
            </div>
            <div>
              <label htmlFor="floor_area_m2" className={labelClass}>
                Pinta-ala (m²)
              </label>
              <input
                id="floor_area_m2"
                name="floor_area_m2"
                type="text"
                inputMode="decimal"
                defaultValue={property?.floor_area_m2 ?? ""}
                placeholder="120"
                className={formInputClass}
              />
            </div>
          </div>
        </fieldset>

        <fieldset className={fieldsetClass}>
          <legend className={legendClass}>Lämmitys</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="heating_primary" className={labelClass}>
                Pääasiallinen lämmitysmuoto
              </label>
              <select
                id="heating_primary"
                name="heating_primary"
                defaultValue={d.heating?.primary ?? ""}
                className={formInputClass}
              >
                <option value="">Valitse…</option>
                {HEATING_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {HEATING_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="heating_secondary" className={labelClass}>
                Toinen lämmitysmuoto (valinnainen)
              </label>
              <select
                id="heating_secondary"
                name="heating_secondary"
                defaultValue={d.heating?.secondary ?? ""}
                className={formInputClass}
              >
                <option value="">Ei toista</option>
                {HEATING_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {HEATING_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="heating_notes" className={labelClass}>
              Lisätiedot lämmityksestä
            </label>
            <textarea
              id="heating_notes"
              name="heating_notes"
              rows={2}
              defaultValue={d.heating?.notes ?? ""}
              placeholder="Esim. vanha öljykattila, suunnitteilla vaihto maalämpöön"
              className={formInputClass}
            />
          </div>
        </fieldset>

        <fieldset className={fieldsetClass}>
          <legend className={legendClass}>Ilmanvaihto</legend>
          <div>
            <label htmlFor="ventilation_type" className={labelClass}>
              Ilmanvaihtotapa
            </label>
            <select
              id="ventilation_type"
              name="ventilation_type"
              defaultValue={d.ventilation?.type ?? ""}
              className={formInputClass}
            >
              <option value="">Valitse…</option>
              {VENTILATION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {VENTILATION_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="ventilation_notes" className={labelClass}>
              Lisätiedot ilmanvaihdosta
            </label>
            <textarea
              id="ventilation_notes"
              name="ventilation_notes"
              rows={2}
              defaultValue={d.ventilation?.notes ?? ""}
              placeholder="Esim. koneellinen poisto, LTO-yksikkö asennettu 2019"
              className={formInputClass}
            />
          </div>
        </fieldset>

        <fieldset className={fieldsetClass}>
          <legend className={legendClass}>Tulisijat ja takat</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="fireplace_count" className={labelClass}>
                Tulisijojen / takkojen lukumäärä
              </label>
              <input
                id="fireplace_count"
                name="fireplace_count"
                type="number"
                min={0}
                max={20}
                defaultValue={d.fireplaces?.count ?? ""}
                placeholder="0"
                className={formInputClass}
              />
            </div>
          </div>
          <div>
            <p className={labelClass}>Tyyppi (valitse kaikki sopivat)</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {FIREPLACE_TYPES.map((t) => (
                <label
                  key={t}
                  className="flex cursor-pointer items-start gap-2 rounded-lg border border-stone-200 bg-white p-3 has-checked:border-sky-600 has-checked:bg-sky-50"
                >
                  <input
                    type="checkbox"
                    name="fireplace_types"
                    value={t}
                    defaultChecked={d.fireplaces?.types?.includes(t)}
                    className="mt-0.5"
                  />
                  <span className="text-sm">{FIREPLACE_TYPE_LABELS[t]}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="fireplace_notes" className={labelClass}>
              Lisätiedot tulisijoista
            </label>
            <textarea
              id="fireplace_notes"
              name="fireplace_notes"
              rows={2}
              defaultValue={d.fireplaces?.notes ?? ""}
              placeholder="Esim. kaksi varaavaa takkauunia, leivinuuni keittiössä"
              className={formInputClass}
            />
          </div>
        </fieldset>

        <fieldset className={fieldsetClass}>
          <legend className={legendClass}>Sauna</legend>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              name="has_sauna"
              value="yes"
              checked={hasSauna}
              onChange={(e) => setHasSauna(e.target.checked)}
              className="rounded border-stone-300"
            />
            <span className="text-sm font-medium text-stone-800">Kohteessa on sauna</span>
          </label>
          {hasSauna && (
            <>
              <div>
                <label htmlFor="sauna_heater_type" className={labelClass}>
                  Kiukaan tyyppi
                </label>
                <select
                  id="sauna_heater_type"
                  name="sauna_heater_type"
                  defaultValue={d.sauna?.heater_type ?? "sahko"}
                  className={formInputClass}
                >
                  {SAUNA_HEATER_TYPES.filter((t) => t !== "ei").map((t) => (
                    <option key={t} value={t}>
                      {SAUNA_HEATER_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="sauna_notes" className={labelClass}>
                  Lisätiedot saunasta
                </label>
                <textarea
                  id="sauna_notes"
                  name="sauna_notes"
                  rows={2}
                  defaultValue={d.sauna?.notes ?? ""}
                  placeholder="Esim. erillinen saunarakennus, puukiuka"
                  className={formInputClass}
                />
              </div>
            </>
          )}
        </fieldset>

        <fieldset className={fieldsetClass}>
          <legend className={legendClass}>Muut tiedot</legend>
          <div>
            <label htmlFor="notes" className={labelClass}>
              Yleiset muistiinpanot
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              defaultValue={property?.notes ?? ""}
              placeholder="Esim. kattoremontti tehty 2020, sähköpääkeskus uusittu"
              className={formInputClass}
            />
          </div>
        </fieldset>

        {state.error && (
          <p className="text-sm text-red-600" role="alert">
            {state.error}
          </p>
        )}
        {state.ok && (
          <p className="text-sm text-sky-800" role="status">
            {state.ok}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className={`${brand.btnPrimary} disabled:opacity-60`}
        >
          {pending
            ? "Tallennetaan…"
            : mode === "create"
              ? "Lisää kiinteistö"
              : "Tallenna muutokset"}
        </button>
      </form>

      {showDelete && property && (
        <form
          action={deleteAction}
          className="rounded-2xl border border-red-200 bg-red-50/50 p-5"
          onSubmit={(e) => {
            if (
              !confirm(
                "Poistetaanko kiinteistö huoltokirjasta? Työhistoria poistuu myös.",
              )
            ) {
              e.preventDefault();
            }
          }}
        >
          <input type="hidden" name="property_id" value={property.id} />
          <h2 className="text-sm font-semibold text-red-900">Poista kiinteistö</h2>
          <p className="mt-1 text-sm text-red-800">
            Poistaa kiinteistön ja kaikki siihen liittyvät huoltokirjamerkinnät.
          </p>
          {deleteState.error && (
            <p className="mt-2 text-sm text-red-700">{deleteState.error}</p>
          )}
          <button
            type="submit"
            disabled={deletePending}
            className="mt-3 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-50 disabled:opacity-60"
          >
            {deletePending ? "Poistetaan…" : "Poista kiinteistö"}
          </button>
        </form>
      )}
    </div>
  );
}
