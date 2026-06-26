"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  deleteThermostat,
  saveHeatingPump,
  saveThermostat,
  toggleThermostat,
  type HeatingActionState,
} from "@/app/actions/heating";
import {
  DEFAULT_HYSTERESIS_C,
  DEFAULT_MIN_OFF_SEC,
  DEFAULT_MIN_ON_SEC,
  DEFAULT_PUMP_START_DELAY_SEC,
  temperatureReadingsForSensor,
  type HeatingPumpConfig,
  type HeatingThermostat,
} from "@/lib/heating-thermostats";
import type { HubLightDevice } from "@/lib/hub-lights";
import { HeatingThermostatCard } from "@/components/heating-thermostat-card";
import { useMetricTrend } from "@/hooks/use-metric-trend";
import { deviceMetricKey, deviceMetricKeyForReading } from "@/lib/device-metrics";
import { protocolLabel } from "@/lib/device-protocol";

type HeatingResponse = {
  configured?: boolean;
  hubOnline?: boolean;
  thermostats?: HeatingThermostat[];
  heatingPump?: HeatingPumpConfig | null;
  sensors?: HubLightDevice[];
  actuators?: HubLightDevice[];
  devices?: HubLightDevice[];
  heatingRuntime?: Record<string, { last_change_at: string; on: boolean }>;
  heatingPumpRuntime?: {
    first_demand_at?: string | null;
    last_change_at?: string;
    on: boolean;
  } | null;
  error?: string;
};

const EMPTY_FORM = {
  id: "",
  name: "",
  enabled: true,
  sensor_device_id: "",
  sensor_reading_label: "" as string | null,
  actuator_device_ids: [] as string[],
  target_temp_c: 21,
  hysteresis_c: DEFAULT_HYSTERESIS_C,
  min_on_sec: DEFAULT_MIN_ON_SEC,
  min_off_sec: DEFAULT_MIN_OFF_SEC,
};

export function HeatingPanel() {
  const [data, setData] = useState<HeatingResponse | null>(null);
  const [flash, setFlash] = useState<HeatingActionState | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [pumpForm, setPumpForm] = useState({
    enabled: false,
    actuator_device_id: "",
  });
  const [pending, startTransition] = useTransition();
  const { showTrend, modal } = useMetricTrend();

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/heating/thermostats", { cache: "no-store" });
      const json = (await res.json()) as HeatingResponse;
      setData(json);
    } catch {
      setData({ error: "Yhteys API:in epäonnistui" });
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 8_000);
    return () => clearInterval(id);
  }, [load]);

  const devices = data?.devices ?? [];
  const sensors = data?.sensors ?? [];
  const actuators = data?.actuators ?? [];
  const thermostats = data?.thermostats ?? [];
  const heatingPump = data?.heatingPump ?? null;
  const pumpRuntime = data?.heatingPumpRuntime;

  function deviceById(id: string): HubLightDevice | undefined {
    return devices.find((d) => d.id === id);
  }

  const pumpActuator = heatingPump ? deviceById(heatingPump.actuator_device_id) : undefined;

  useEffect(() => {
    setPumpForm({
      enabled: Boolean(heatingPump?.enabled),
      actuator_device_id: heatingPump?.actuator_device_id ?? "",
    });
  }, [heatingPump?.enabled, heatingPump?.actuator_device_id]);

  function run(action: () => Promise<HeatingActionState>, options?: { clearForm?: boolean }) {
    startTransition(async () => {
      const result = await action();
      setFlash(result);
      if (result.ok) {
        if (options?.clearForm) setForm(EMPTY_FORM);
        await load();
      }
    });
  }

  function saveZoneTarget(zone: HeatingThermostat, target_temp_c: number) {
    run(() =>
      saveThermostat({
        id: zone.id,
        name: zone.name,
        enabled: zone.enabled,
        sensor_device_id: zone.sensor_device_id,
        sensor_reading_label: zone.sensor_reading_label,
        actuator_device_ids: zone.actuator_device_ids,
        target_temp_c,
        hysteresis_c: zone.hysteresis_c,
        min_on_sec: zone.min_on_sec,
        min_off_sec: zone.min_off_sec,
        room: zone.room,
      }),
    );
  }

  function actuatorsForZone(zone: HeatingThermostat): HubLightDevice[] {
    return zone.actuator_device_ids
      .map((id) => deviceById(id))
      .filter((d): d is HubLightDevice => d != null);
  }

  function toggleActuatorInForm(deviceId: string) {
    setForm((f) => {
      const has = f.actuator_device_ids.includes(deviceId);
      return {
        ...f,
        actuator_device_ids: has
          ? f.actuator_device_ids.filter((id) => id !== deviceId)
          : [...f.actuator_device_ids, deviceId],
      };
    });
  }

  const selectedSensor = form.sensor_device_id ? deviceById(form.sensor_device_id) : undefined;
  const sensorReadingOptions = selectedSensor ? temperatureReadingsForSensor(selectedSensor) : [];

  function sensorTempMetric(sensor?: HubLightDevice, readingLabel?: string | null): string | null {
    if (!sensor) return null;
    if (readingLabel) return deviceMetricKeyForReading(sensor.id, readingLabel);
    if (sensor.temperature_c != null) return deviceMetricKey(sensor.id, "temperature_c");
    const tempReading = sensor.readings?.find((r) => r.value.includes("°C"));
    if (tempReading) return deviceMetricKeyForReading(sensor.id, tempReading.label);
    return null;
  }

  return (
    <div className="space-y-6">
      {modal}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">Lämmitys</h1>
        <p className="mt-2 text-sm text-stone-600">
          Luo termostaattialueita valitsemalla lämpötilalähde, yksi tai useampi lämmitystoimilainen ja tavoitelämpötila.
        </p>
      </div>

      {data?.configured === false && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-semibold">Laitteet eivät ole vielä synkassa</p>
          <p className="mt-1">Odota Yellow-synkkiä tai määritä laitteet Asetuksissa.</p>
        </div>
      )}

      {data?.hubOnline === false && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          Yellow ei ole online — viimeisin tila näytetään.
        </div>
      )}

      {data?.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">{data.error}</div>
      )}

      {flash?.ok && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-900">{flash.ok}</div>
      )}
      {flash?.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900">{flash.error}</div>
      )}

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-stone-900">Termostaatit</h2>
          <p className="mt-1 text-sm text-stone-600">
            Säädä tavoitelämpötilaa +/- -painikkeilla. Yellow ohjaa lämmitystä automaattisesti.
          </p>
        </div>

        {thermostats.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {thermostats.map((zone) => (
              <HeatingThermostatCard
                key={zone.id}
                zone={zone}
                sensor={deviceById(zone.sensor_device_id)}
                actuators={actuatorsForZone(zone)}
                pending={pending}
                onShowTrend={() => {
                  const metric = sensorTempMetric(deviceById(zone.sensor_device_id), zone.sensor_reading_label);
                  if (metric) showTrend(metric);
                }}
                onToggleEnabled={() => run(() => toggleThermostat(zone.id, !zone.enabled))}
                onSetTarget={(target) => saveZoneTarget(zone, target)}
                onEdit={() =>
                  setForm({
                    id: zone.id,
                    name: zone.name,
                    enabled: zone.enabled,
                    sensor_device_id: zone.sensor_device_id,
                    sensor_reading_label: zone.sensor_reading_label ?? "",
                    actuator_device_ids: [...zone.actuator_device_ids],
                    target_temp_c: zone.target_temp_c,
                    hysteresis_c: zone.hysteresis_c,
                    min_on_sec: zone.min_on_sec ?? DEFAULT_MIN_ON_SEC,
                    min_off_sec: zone.min_off_sec ?? DEFAULT_MIN_OFF_SEC,
                  })
                }
                onDelete={() => {
                  if (window.confirm(`Poistetaanko "${zone.name}"?`)) {
                    run(() => deleteThermostat(zone.id), { clearForm: true });
                  }
                }}
              />
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 px-4 py-8 text-center text-sm text-stone-500">
            Ei termostaatteja vielä — luo ensimmäinen alla.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-900">Lattialämmityspumppu</h2>
        <p className="mt-1 text-sm text-stone-600">
          Yksi jaettu pumppu kaikille termostaateille. Käynnistyy{" "}
          {DEFAULT_PUMP_START_DELAY_SEC / 60} min viiveellä kun ensimmäinen termostaatti pyytää lämpöä, sammuu
          heti kun mikään ei pyydä.
        </p>

        {pumpActuator && (
          <p className="mt-2 text-sm text-stone-700">
            Tila: {pumpActuator.on ? "päällä" : "pois"}
            {pumpRuntime?.first_demand_at && !pumpActuator.on
              ? " · käynnistysviive käynnissä"
              : ""}
            <button
              type="button"
              onClick={() => showTrend(deviceMetricKey(pumpActuator.id, "state:on"))}
              className="ml-2 text-xs font-medium text-stone-500 underline-offset-2 hover:text-stone-800 hover:underline"
            >
              Trendi
            </button>
          </p>
        )}

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-2 sm:col-span-2">
            <input
              type="checkbox"
              checked={pumpForm.enabled}
              onChange={(e) => setPumpForm((f) => ({ ...f, enabled: e.target.checked }))}
              className="rounded border-stone-300"
            />
            <span className="text-sm text-stone-700">Ohjaa lattialämmityspumppua automaattisesti</span>
          </label>

          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-stone-700">Pumppurele</span>
            <select
              value={pumpForm.actuator_device_id}
              onChange={(e) => setPumpForm((f) => ({ ...f, actuator_device_id: e.target.value }))}
              disabled={!pumpForm.enabled}
              className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm disabled:bg-stone-50"
            >
              <option value="">Valitse rele/kytkin…</option>
              {actuators.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                  {d.on ? " (päällä)" : " (pois)"}
                  {d.room ? ` · ${d.room}` : ""}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4">
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              run(() =>
                saveHeatingPump({
                  enabled: pumpForm.enabled,
                  actuator_device_id: pumpForm.actuator_device_id,
                }),
              )
            }
            className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Tallenna pumppuasetus
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-900">
          {form.id ? "Muokkaa termostaattia" : "Uusi termostaatti"}
        </h2>
        <p className="mt-1 text-sm text-stone-600">
          Valitse lämpötilalähde, yksi tai useampi lämmitystoimilainen ja tavoitelämpötila.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-stone-700">Nimi</span>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Esim. Olohuone"
              className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-stone-700">Lämpötilalähde</span>
            <select
              value={form.sensor_device_id}
              onChange={(e) => {
                const deviceId = e.target.value;
                const device = deviceById(deviceId);
                const readings = device ? temperatureReadingsForSensor(device) : [];
                setForm((f) => ({
                  ...f,
                  sensor_device_id: deviceId,
                  sensor_reading_label: readings.length === 1 ? readings[0].label : "",
                }));
              }}
              className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
            >
              <option value="">Valitse laite…</option>
              {sensors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                  {d.temperature_c != null ? ` (${d.temperature_c.toFixed(1)} °C)` : ""}
                  {d.room ? ` · ${d.room}` : ""}
                </option>
              ))}
            </select>
            {sensors.length === 0 && (
              <p className="mt-1 text-xs text-stone-500">
                Ei lämpötilalähteitä — kaikki laitteet joilla on lämpötilalukema näkyvät synkin jälkeen.
              </p>
            )}
          </label>

          {sensorReadingOptions.length > 1 && (
            <label className="block">
              <span className="text-sm font-medium text-stone-700">Lämpötilalukema</span>
              <select
                value={form.sensor_reading_label ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, sensor_reading_label: e.target.value || null }))
                }
                className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
              >
                <option value="">Oletus</option>
                {sensorReadingOptions.map((r) => (
                  <option key={r.label} value={r.label}>
                    {r.label}: {r.value}
                  </option>
                ))}
              </select>
            </label>
          )}

          <fieldset className="block sm:col-span-2">
            <legend className="text-sm font-medium text-stone-700">Lämmitystoimilaiset</legend>
            <p className="mt-0.5 text-xs text-stone-500">
              Valitse yksi tai useampi kytkin/rele. Kaikki valitut laitteet ohjataan yhdessä.
            </p>
            {actuators.length > 0 ? (
              <div className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded-xl border border-stone-200 p-2">
                {actuators.map((d) => (
                  <label
                    key={d.id}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-stone-50"
                  >
                    <input
                      type="checkbox"
                      checked={form.actuator_device_ids.includes(d.id)}
                      onChange={() => toggleActuatorInForm(d.id)}
                      className="rounded border-stone-300"
                    />
                    <span className="text-sm text-stone-800">
                      {d.name}
                      {d.on ? " (päällä)" : " (pois)"}
                      {d.room ? ` · ${d.room}` : ""}
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-xs text-stone-500">
                Ei ohjattavia kytkimiä — valitse laite jolla on kytkin- tai releohjaus.
              </p>
            )}
          </fieldset>

          <label className="block">
            <span className="text-sm font-medium text-stone-700">Tavoitelämpötila (°C)</span>
            <input
              type="number"
              min={5}
              max={35}
              step={0.5}
              value={form.target_temp_c}
              onChange={(e) =>
                setForm((f) => ({ ...f, target_temp_c: Number(e.target.value) || 21 }))
              }
              className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-stone-700">Hystereesi (°C)</span>
            <input
              type="number"
              min={0.1}
              max={5}
              step={0.1}
              value={form.hysteresis_c}
              onChange={(e) =>
                setForm((f) => ({ ...f, hysteresis_c: Number(e.target.value) || DEFAULT_HYSTERESIS_C }))
              }
              className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-stone-700">Min. päällä (s)</span>
            <input
              type="number"
              min={0}
              max={3600}
              step={30}
              value={form.min_on_sec}
              onChange={(e) =>
                setForm((f) => ({ ...f, min_on_sec: Number(e.target.value) || DEFAULT_MIN_ON_SEC }))
              }
              className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-stone-700">Min. pois (s)</span>
            <input
              type="number"
              min={0}
              max={3600}
              step={30}
              value={form.min_off_sec}
              onChange={(e) =>
                setForm((f) => ({ ...f, min_off_sec: Number(e.target.value) || DEFAULT_MIN_OFF_SEC }))
              }
              className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
            />
          </label>

          <label className="flex items-center gap-2 sm:col-span-2">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
              className="rounded border-stone-300"
            />
            <span className="text-sm text-stone-700">Termostaatti käytössä</span>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              run(
                () =>
                  saveThermostat({
                    id: form.id || undefined,
                    name: form.name,
                    enabled: form.enabled,
                    sensor_device_id: form.sensor_device_id,
                    sensor_reading_label: form.sensor_reading_label || null,
                    actuator_device_ids: form.actuator_device_ids,
                    target_temp_c: form.target_temp_c,
                    hysteresis_c: form.hysteresis_c,
                    min_on_sec: form.min_on_sec,
                    min_off_sec: form.min_off_sec,
                  }),
                { clearForm: true },
              )
            }
            className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {form.id ? "Tallenna muutokset" : "Luo termostaatti"}
          </button>
          {form.id && (
            <button
              type="button"
              onClick={() => setForm(EMPTY_FORM)}
              className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-medium"
            >
              Peruuta muokkaus
            </button>
          )}
        </div>

        {(sensors.length > 0 || actuators.length > 0) && (
          <details className="mt-5 rounded-xl border border-stone-100 bg-stone-50 p-3 text-xs text-stone-600">
            <summary className="cursor-pointer font-medium text-stone-700">Saatavilla olevat laitteet</summary>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <div>
                <p className="font-medium text-stone-800">Anturit ({sensors.length})</p>
                <ul className="mt-1 space-y-1">
                  {sensors.map((d) => (
                    <li key={d.id}>
                      {d.name} · {protocolLabel(d.protocol)}
                      {d.temperature_c != null ? ` · ${d.temperature_c.toFixed(1)} °C` : ""}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-medium text-stone-800">Toimilaiset ({actuators.length})</p>
                <ul className="mt-1 space-y-1">
                  {actuators.map((d) => (
                    <li key={d.id}>
                      {d.name} · {protocolLabel(d.protocol)} · {d.on ? "päällä" : "pois"}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </details>
        )}
      </section>
    </div>
  );
}
