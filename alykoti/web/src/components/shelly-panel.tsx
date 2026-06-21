"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  addShellyDevice,
  discoverShellyDevices,
  probeShellyHost,
  removeShellyDevice,
  type DeviceActionState,
} from "@/app/actions/integrations";
import type { ShellyDeviceConfig, ShellyDeviceRole, ShellyDiscoveredDevice } from "@/lib/types";

type ShellyLive = {
  id: string;
  name: string;
  on: boolean;
  host: string;
  role: ShellyDeviceRole;
  reachable?: boolean;
  power_w?: number | null;
  energy_wh?: number | null;
  em_a_power_w?: number | null;
  em_b_power_w?: number | null;
};

type ShellyResponse = {
  configured: boolean;
  hubOnline?: boolean;
  devices: ShellyDeviceConfig[];
  live?: ShellyLive[];
  discovered?: ShellyDiscoveredDevice[];
};

function roleLabel(role?: ShellyDeviceRole): string {
  return role === "em" ? "Energiamittari" : "Valokytkin";
}

function formatPower(w?: number | null): string | null {
  if (w == null || !Number.isFinite(w)) return null;
  return `${Math.round(w)} W`;
}

function formatEnergy(wh?: number | null): string | null {
  if (wh == null || !Number.isFinite(wh)) return null;
  if (wh >= 1000) return `${(wh / 1000).toFixed(1)} kWh`;
  return `${Math.round(wh)} Wh`;
}

function emStatusText(live: ShellyLive | undefined): string {
  if (!live?.reachable) return "Ei vastausta";
  const total = formatPower(live.power_w);
  const energy = formatEnergy(live.energy_wh);
  const parts = [total, energy].filter(Boolean);
  if (live.em_a_power_w != null && live.em_b_power_w != null) {
    parts.push(`A ${Math.round(live.em_a_power_w)} W`, `B ${Math.round(live.em_b_power_w)} W`);
  }
  return parts.join(" · ") || "Online";
}

export function ShellyPanel() {
  const [data, setData] = useState<ShellyResponse | null>(null);
  const [flash, setFlash] = useState<DeviceActionState | null>(null);
  const [host, setHost] = useState("");
  const [name, setName] = useState("");
  const [manualRole, setManualRole] = useState<ShellyDeviceRole>("switch");
  const [pending, startTransition] = useTransition();

  const load = useCallback(async () => {
    const res = await fetch("/api/integrations/shelly", { cache: "no-store" });
    setData((await res.json()) as ShellyResponse);
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 8_000);
    return () => clearInterval(id);
  }, [load]);

  function run(action: () => Promise<DeviceActionState>, reload = true) {
    startTransition(async () => {
      const result = await action();
      setFlash(result);
      if (result.ok && reload) {
        if (!result.ok.includes("Yellow")) {
          setHost("");
          setName("");
        }
        await load();
      }
    });
  }

  const devices = data?.devices ?? [];
  const live = data?.live ?? [];
  const discovered = data?.discovered ?? [];
  const configuredHosts = new Set(devices.map((d) => d.host));

  const emDevices = devices.filter((d) => (d.role ?? "switch") === "em");
  const switchDevices = devices.filter((d) => (d.role ?? "switch") !== "em");

  return (
    <div className="mt-6 space-y-6">
      {flash?.ok && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-900">
          {flash.ok}
        </div>
      )}
      {flash?.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          {flash.error}
        </div>
      )}

      {data?.hubOnline === false && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
          Yellow offline — haku ja ohjaus vaativat Pi-yhteyden.
        </div>
      )}

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-900">Etsi verkosta</h2>
        <p className="mt-1 text-sm text-stone-600">
          Löytää Pro EM -energiamittarit ja valokytkimet. Tulokset ~30 s kuluttua.
        </p>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            run(async () => {
              const r = await discoverShellyDevices();
              return r.ok
                ? { ok: "Haku käynnissä Yellowilla — päivitä sivu hetken kuluttua." }
                : r;
            }, false)
          }
          className="mt-4 rounded-xl bg-stone-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Etsi Shellyt verkosta
        </button>

        {discovered.length > 0 && (
          <ul className="mt-4 divide-y divide-stone-100">
            {discovered.map((item) => (
              <li key={item.host} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-medium text-stone-900">{item.name}</p>
                  <p className="text-xs text-stone-500">
                    {item.host}
                    {item.model && ` · ${item.model}`}
                    {` · ${roleLabel(item.role)}`}
                  </p>
                </div>
                {configuredHosts.has(item.host) ? (
                  <span className="text-xs text-stone-500">Lisätty</span>
                ) : (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      run(() =>
                        addShellyDevice(
                          item.host,
                          item.name,
                          0,
                          item.gen ?? 2,
                          item.model,
                          item.role,
                        ),
                      )
                    }
                    className="rounded-lg border border-stone-200 px-3 py-1.5 text-sm hover:bg-stone-50"
                  >
                    Lisää
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-900">Lisää IP:llä</h2>
        <form
          className="mt-4 flex flex-wrap gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => addShellyDevice(host, name || host, 0, 2, undefined, manualRole));
          }}
        >
          <input
            type="text"
            inputMode="decimal"
            placeholder="192.168.50.120"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            className="min-w-[10rem] flex-1 rounded-xl border border-stone-200 px-3 py-2 text-sm"
            required
          />
          <input
            type="text"
            placeholder="Nimi (valinnainen)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="min-w-[10rem] flex-1 rounded-xl border border-stone-200 px-3 py-2 text-sm"
          />
          <select
            value={manualRole}
            onChange={(e) => setManualRole(e.target.value as ShellyDeviceRole)}
            className="rounded-xl border border-stone-200 px-3 py-2 text-sm"
          >
            <option value="em">Energiamittari (Pro EM)</option>
            <option value="switch">Valokytkin</option>
          </select>
          <button
            type="button"
            disabled={pending || !host.trim()}
            onClick={() => run(() => probeShellyHost(host))}
            className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            Testaa
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Lisää
          </button>
        </form>
      </section>

      <DeviceList
        title="Energiamittarit (Pro EM)"
        empty="Ei energiamittareita — lisää 4 Pro EM -laitetta."
        devices={emDevices}
        live={live}
        hubOnline={data?.hubOnline}
        pending={pending}
        onRemove={(id) => run(() => removeShellyDevice(id))}
        statusText={(l) => emStatusText(l)}
      />

      <DeviceList
        title="Valokytkimet"
        empty="Ei valokytkimiä."
        devices={switchDevices}
        live={live}
        hubOnline={data?.hubOnline}
        pending={pending}
        onRemove={(id) => run(() => removeShellyDevice(id))}
        statusText={(l) => {
          if (!l?.reachable) return "Ei vastausta";
          return l.on ? "Päällä" : "Pois";
        }}
      />
    </div>
  );
}

function DeviceList({
  title,
  empty,
  devices,
  live,
  hubOnline,
  pending,
  onRemove,
  statusText,
}: {
  title: string;
  empty: string;
  devices: ShellyDeviceConfig[];
  live: ShellyLive[];
  hubOnline?: boolean;
  pending: boolean;
  onRemove: (id: string) => void;
  statusText: (live: ShellyLive | undefined) => string;
}) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-stone-900">{title}</h2>
      {devices.length === 0 ? (
        <p className="mt-3 text-sm text-stone-500">{empty}</p>
      ) : (
        <ul className="mt-4 divide-y divide-stone-100">
          {devices.map((dev) => {
            const status = live.find((l) => l.id === dev.id);
            return (
              <li key={dev.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-medium text-stone-900">{dev.name}</p>
                  <p className="text-xs text-stone-500">
                    {dev.host}
                    {dev.model && ` · ${dev.model}`}
                    {status && ` · ${statusText(status)}`}
                    {!status && hubOnline && " · Odottaa synkkiä"}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => onRemove(dev.id)}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-800"
                >
                  Poista
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
