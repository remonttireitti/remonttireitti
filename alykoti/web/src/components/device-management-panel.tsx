"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  renameHubDevice,
  startZigbeePairing,
  startZwaveInclusion,
  stopZwaveInclusion,
  updateDeviceOverride,
  type DeviceActionState,
} from "@/app/actions/devices";
import {
  filterByProtocol,
  groupIdsByProtocol,
  protocolLabel,
  type DeviceProtocol,
} from "@/lib/device-protocol";
import { kindLabel } from "@/lib/hub-lights";
import { FLOOR_PLAN_ANCHORS } from "@/lib/floor-plan";

type Device = {
  id: string;
  name: string;
  on: boolean;
  protocol: DeviceProtocol;
  kind: string;
  room: string | null;
  controllable: boolean;
  capabilitiesLabel?: string;
  readingLabel?: string | null;
  locked?: boolean | null;
  node_id?: number;
};

type DevicesResponse = {
  configured: boolean;
  hubOnline?: boolean;
  devices: Device[];
  message?: string;
};

type Props = {
  protocol?: DeviceProtocol;
  title?: string;
  description?: string;
  groupByProtocol?: boolean;
};

export function DeviceManagementPanel({
  protocol,
  title,
  description,
  groupByProtocol = false,
}: Props) {
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

  const allDevices = data?.devices ?? [];

  const visibleDevices = useMemo(() => {
    if (!protocol) return allDevices;
    return filterByProtocol(allDevices, protocol);
  }, [allDevices, protocol]);

  const grouped = useMemo(() => {
    if (!groupByProtocol) return null;
    return groupIdsByProtocol(allDevices);
  }, [allDevices, groupByProtocol]);

  const anchors = FLOOR_PLAN_ANCHORS.filter((a) => a.kind === "light");

  const showZigbeePairing = !protocol || protocol === "zigbee";
  const showZwavePairing = !protocol || protocol === "zwave";

  return (
    <div className="mt-6 space-y-6">
      {(title || description) && (
        <div>
          {title && <h2 className="text-lg font-semibold text-stone-900">{title}</h2>}
          {description && <p className="mt-1 text-sm text-stone-600">{description}</p>}
        </div>
      )}

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

      {(showZigbeePairing || showZwavePairing) && (
        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-900">Paritus</h2>
          <p className="mt-1 text-sm text-stone-600">
            Käynnistä paritus Yellowilla. Uudet laitteet ilmestyvät listaan ~30 s synkin jälkeen.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            {showZigbeePairing && (
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => startZigbeePairing(120))}
                className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-50"
              >
                Zigbee paritus (2 min)
              </button>
            )}
            {showZwavePairing && (
              <>
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
              </>
            )}
          </div>
          <p className="mt-3 text-xs text-stone-500">
            Zigbee2MQTT:{" "}
            <a className="underline" href="http://192.168.50.108:8080" target="_blank" rel="noreferrer">
              :8080
            </a>{" "}
            · Z-Wave JS UI:{" "}
            <a className="underline" href="http://192.168.50.108:8091" target="_blank" rel="noreferrer">
              :8091
            </a>
          </p>
        </section>
      )}

      {grouped ? (
        grouped.length === 0 ? (
          <EmptyDevices onRefresh={() => void load()} pending={pending} />
        ) : (
          grouped.map((group) => (
            <DeviceListSection
              key={group.protocol}
              title={`${group.label} (${group.items.length})`}
              devices={group.items}
              pending={pending}
              editingId={editingId}
              editName={editName}
              editRoom={editRoom}
              onEditStart={(d) => {
                setEditingId(d.id);
                setEditName(d.name);
                setEditRoom(d.room ?? "");
              }}
              onEditCancel={() => setEditingId(null)}
              onEditName={setEditName}
              onEditRoom={setEditRoom}
              onSave={(device) => {
                run(async () => {
                  await updateDeviceOverride(device.id, {
                    display_name: editName.trim() || undefined,
                    room: editRoom.trim() || null,
                  });
                  if (editName.trim() && editName.trim() !== device.name) {
                    return renameHubDevice(device.id, editName.trim(), device.node_id);
                  }
                  return { ok: "Tallennettu." };
                });
                setEditingId(null);
              }}
              onHide={(id) => run(() => updateDeviceOverride(id, { hidden: true }))}
              onRefresh={() => void load()}
            />
          ))
        )
      ) : (
        <DeviceListSection
          title={`Laitteet (${visibleDevices.length})`}
          devices={visibleDevices}
          pending={pending}
          editingId={editingId}
          editName={editName}
          editRoom={editRoom}
          onEditStart={(d) => {
            setEditingId(d.id);
            setEditName(d.name);
            setEditRoom(d.room ?? "");
          }}
          onEditCancel={() => setEditingId(null)}
          onEditName={setEditName}
          onEditRoom={setEditRoom}
          onSave={(device) => {
            run(async () => {
              await updateDeviceOverride(device.id, {
                display_name: editName.trim() || undefined,
                room: editRoom.trim() || null,
              });
              if (editName.trim() && editName.trim() !== device.name) {
                return renameHubDevice(device.id, editName.trim(), device.node_id);
              }
              return { ok: "Tallennettu." };
            });
            setEditingId(null);
          }}
          onHide={(id) => run(() => updateDeviceOverride(id, { hidden: true }))}
          onRefresh={() => void load()}
          emptyText={
            protocol
              ? `Ei ${protocolLabel(protocol)}-laitteita — odota synkkiä tai käynnistä paritus.`
              : undefined
          }
        />
      )}

      <section className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 p-4 text-sm text-stone-600">
        <p className="font-medium text-stone-800">Mitä näkyy listassa?</p>
        <p className="mt-1">
          Yellow synkkaa laitteet MQTT/HTTP:stä. Z-Wave-laitteet tarvitsevat MQTT-viestin skannauksen
          aikana — hiljaiset anturit voivat puuttua ensimmäiseltä kerralta. Shelly ja Tasmota näkyvät omilla
          sivuillaan ja täällä kanavina (<code className="text-xs">shelly:…</code>,{" "}
          <code className="text-xs">tasmota:…</code>).
        </p>
        <p className="mt-2">
          Kartta-ankkurit: {anchors.map((a) => a.label).join(", ") || "—"} (
          <code className="text-xs">src/lib/lights-config.ts</code>).
        </p>
      </section>
    </div>
  );
}

function EmptyDevices({ onRefresh, pending }: { onRefresh: () => void; pending: boolean }) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-stone-600">Ei laitteita — käynnistä paritus tai odota synkkiä.</p>
      <button
        type="button"
        onClick={onRefresh}
        disabled={pending}
        className="mt-3 rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium"
      >
        Päivitä
      </button>
    </section>
  );
}

function DeviceListSection({
  title,
  devices,
  pending,
  editingId,
  editName,
  editRoom,
  onEditStart,
  onEditCancel,
  onEditName,
  onEditRoom,
  onSave,
  onHide,
  onRefresh,
  emptyText,
}: {
  title: string;
  devices: Device[];
  pending: boolean;
  editingId: string | null;
  editName: string;
  editRoom: string;
  onEditStart: (d: Device) => void;
  onEditCancel: () => void;
  onEditName: (v: string) => void;
  onEditRoom: (v: string) => void;
  onSave: (d: Device) => void;
  onHide: (id: string) => void;
  onRefresh: () => void;
  emptyText?: string;
}) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-stone-900">{title}</h2>
        <button
          type="button"
          onClick={onRefresh}
          disabled={pending}
          className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium"
        >
          Päivitä
        </button>
      </div>

      {devices.length === 0 ? (
        <p className="mt-4 text-sm text-stone-600">{emptyText ?? "Ei laitteita tässä ryhmässä."}</p>
      ) : (
        <ul className="mt-4 divide-y divide-stone-100">
          {devices.map((device) => (
            <li key={device.id} className="py-4 first:pt-0">
              {editingId === device.id ? (
                <form
                  className="grid gap-3 sm:grid-cols-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    onSave(device);
                  }}
                >
                  <label className="block text-sm">
                    <span className="text-stone-600">Nimi</span>
                    <input
                      value={editName}
                      onChange={(e) => onEditName(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="text-stone-600">Huone</span>
                    <input
                      value={editRoom}
                      onChange={(e) => onEditRoom(e.target.value)}
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
                      onClick={onEditCancel}
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
                      {protocolLabel(device.protocol)} ·{" "}
                      {device.capabilitiesLabel || kindLabel(device.kind as "light")}
                      {device.room ? ` · ${device.room}` : ""}
                      {device.readingLabel
                        ? ` · ${device.readingLabel}`
                        : device.on
                          ? " · päällä"
                          : ""}
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] text-stone-400">{device.id}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onEditStart(device)}
                      className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium"
                    >
                      Muokkaa
                    </button>
                    <button
                      type="button"
                      onClick={() => onHide(device.id)}
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
  );
}
