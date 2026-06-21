"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  renameHubDevice,
  startZigbeePairing,
  startZwaveInclusion,
  stopZwaveInclusion,
  updateDeviceOverride,
  type DeviceActionState,
} from "@/app/actions/devices";
import { kindLabel } from "@/lib/hub-lights";
import { FLOOR_PLAN_ANCHORS } from "@/lib/floor-plan";

type Device = {
  id: string;
  name: string;
  on: boolean;
  protocol: "zigbee" | "zwave" | "shelly";
  kind: string;
  room: string | null;
  controllable: boolean;
  node_id?: number;
};

type DevicesResponse = {
  configured: boolean;
  hubOnline?: boolean;
  devices: Device[];
  message?: string;
};

export function DeviceManagementPanel() {
  const [data, setData] = useState<DevicesResponse | null>(null);
  const [flash, setFlash] = useState<DeviceActionState | null>(null);
  const [pending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editRoom, setEditRoom] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/home/devices", { cache: "no-store" });
    setData((await res.json()) as DevicesResponse);
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 8_000);
    return () => clearInterval(id);
  }, [load]);

  function run(action: () => Promise<DeviceActionState>) {
    startTransition(async () => {
      const result = await action();
      setFlash(result);
      if (result.ok) await load();
    });
  }

  const devices = data?.devices ?? [];
  const anchors = FLOOR_PLAN_ANCHORS.filter((a) => a.kind === "light");

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

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-900">Paritus</h2>
        <p className="mt-1 text-sm text-stone-600">
          Käynnistä paritus Yellowilla. Zigbee: SkyConnect. Z-Wave: Z-Pi 7.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => startZigbeePairing(120))}
            className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-50"
          >
            Zigbee paritus (2 min)
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(startZwaveInclusion)}
            className="rounded-xl border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-800 hover:bg-stone-50 disabled:opacity-50"
          >
            Z-Wave paritus päälle
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(stopZwaveInclusion)}
            className="rounded-xl border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-800 hover:bg-stone-50 disabled:opacity-50"
          >
            Z-Wave paritus pois
          </button>
        </div>
        <p className="mt-3 text-xs text-stone-500">
          Uudet laitteet ilmestyvät listaan ~30 s synkin jälkeen. Zigbee2MQTT:{" "}
          <a className="underline" href="http://192.168.50.108:8080" target="_blank" rel="noreferrer">
            :8080
          </a>{" "}
          · Z-Wave JS UI:{" "}
          <a className="underline" href="http://192.168.50.108:8091" target="_blank" rel="noreferrer">
            :8091
          </a>
        </p>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-stone-900">Laitteet ({devices.length})</h2>
          <button
            type="button"
            onClick={() => void load()}
            disabled={pending}
            className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium"
          >
            Päivitä
          </button>
        </div>

        {devices.length === 0 ? (
          <p className="mt-4 text-sm text-stone-600">Ei laitteita — käynnistä paritus tai odota synkkiä.</p>
        ) : (
          <ul className="mt-4 divide-y divide-stone-100">
            {devices.map((device) => (
              <li key={device.id} className="py-4 first:pt-0">
                {editingId === device.id ? (
                  <form
                    className="grid gap-3 sm:grid-cols-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      run(async () => {
                        await updateDeviceOverride(device.id, {
                          display_name: editName.trim() || undefined,
                          room: editRoom.trim() || null,
                        });
                        if (editName.trim() && editName.trim() !== device.name) {
                          return renameHubDevice(
                            device.id,
                            editName.trim(),
                            device.node_id,
                          );
                        }
                        return { ok: "Tallennettu." };
                      });
                      setEditingId(null);
                    }}
                  >
                    <label className="block text-sm">
                      <span className="text-stone-600">Nimi</span>
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2"
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="text-stone-600">Huone</span>
                      <input
                        value={editRoom}
                        onChange={(e) => setEditRoom(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2"
                        placeholder="Esim. Makuuhuone"
                      />
                    </label>
                    <div className="flex gap-2 sm:col-span-2">
                      <button type="submit" className="rounded-lg bg-stone-900 px-4 py-2 text-sm text-white">
                        Tallenna
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="rounded-lg border px-4 py-2 text-sm"
                      >
                        Peruuta
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-stone-900">{device.name}</p>
                      <p className="text-xs text-stone-500">
                        {device.protocol === "zwave"
                          ? "Z-Wave"
                          : device.protocol === "shelly"
                            ? "Shelly"
                            : "Zigbee"}{" "}
                        ·{" "}
                        {kindLabel(device.kind as "light")}
                        {device.room ? ` · ${device.room}` : ""}
                        {device.on ? " · päällä" : ""}
                      </p>
                      <p className="mt-0.5 font-mono text-[10px] text-stone-400">{device.id}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(device.id);
                          setEditName(device.name);
                          setEditRoom(device.room ?? "");
                        }}
                        className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium"
                      >
                        Muokkaa
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          run(() =>
                            updateDeviceOverride(device.id, {
                              hidden: true,
                            }),
                          )
                        }
                        className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs text-stone-500"
                      >
                        Piilota
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 p-4 text-sm text-stone-600">
        <p className="font-medium text-stone-800">Kartta-asetukset</p>
        <p className="mt-1">
          Pohjakartan ankkurit: {anchors.map((a) => a.label).join(", ") || "—"}. Karttalinkitys
          tiedostossa <code className="text-xs">src/lib/lights-config.ts</code>.
        </p>
      </section>
    </div>
  );
}
