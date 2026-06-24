"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  renameHubDevice,
  renameDeviceItem,
  startZigbeePairing,
  startZwaveInclusion,
  stopZwaveInclusion,
  updateDeviceOverride,
  type DeviceActionState,
} from "@/app/actions/devices";
import {
  filterByProtocol,
  groupIdsByProtocol,
  parseZwaveDeviceId,
  protocolLabel,
  type DeviceProtocol,
} from "@/lib/device-protocol";
import { wifiEntityRenameTarget } from "@/lib/device-item-overrides";
import { kindLabel } from "@/lib/hub-lights";
import { DEVICE_ROLE_OPTIONS, deviceRoleLabel } from "@/lib/device-roles";
import type { DeviceRole } from "@/lib/device-roles";
import { groupZwaveDevicesForList } from "@/lib/zwave-detail";
import { HOUSE_ROOMS } from "@/lib/rooms";
import { LAITTEET } from "@/lib/laitteet-paths";
import Link from "next/link";

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
  role?: DeviceRole;
  inferredRole?: DeviceRole;
  roleOverride?: DeviceRole | null;
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
  const [busyId, setBusyId] = useState<string | null>(null);
  const [controlFlash, setControlFlash] = useState<string | null>(null);
  const [optimisticOn, setOptimisticOn] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editRoom, setEditRoom] = useState("");
  const [editRole, setEditRole] = useState<DeviceRole | "">("");

  const load = useCallback(async () => {
    const res = await fetch("/api/home/devices", { cache: "no-store" });
    setData((await res.json()) as DevicesResponse);
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 8_000);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    if (!data?.devices) return;
    setOptimisticOn((prev) => {
      if (Object.keys(prev).length === 0) return prev;
      const next = { ...prev };
      for (const d of data.devices) {
        if (next[d.id] !== undefined && next[d.id] === d.on) {
          delete next[d.id];
        }
      }
      return next;
    });
  }, [data]);

  function effectiveOn(device: Device): boolean {
    return optimisticOn[device.id] ?? device.on;
  }

  function run(action: () => Promise<DeviceActionState>) {
    startTransition(async () => {
      const result = await action();
      setFlash(result);
      if (result.ok) await load();
    });
  }

  function toggleDevice(device: Device, on: boolean) {
    if (!device.controllable || busyId === device.id) return;
    setOptimisticOn((prev) => ({ ...prev, [device.id]: on }));
    setBusyId(device.id);
    startTransition(async () => {
      try {
        const res = await fetch("/api/lights/control", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: device.id, on }),
        });
        const json = (await res.json()) as { ok?: boolean; error?: string };
        if (!json.ok) {
          setControlFlash(json.error ?? "Ohjaus epäonnistui");
          setOptimisticOn((prev) => {
            const next = { ...prev };
            delete next[device.id];
            return next;
          });
        } else {
          setControlFlash(null);
          void load();
        }
      } catch {
        setControlFlash("Ohjaus epäonnistui");
        setOptimisticOn((prev) => {
          const next = { ...prev };
          delete next[device.id];
          return next;
        });
      } finally {
        setBusyId(null);
      }
    });
  }

  const allDevices = data?.devices ?? [];

  const visibleDevices = useMemo(() => {
    const filtered = !protocol ? allDevices : filterByProtocol(allDevices, protocol);
    if (protocol === "zwave") {
      return groupZwaveDevicesForList(filtered);
    }
    return filtered;
  }, [allDevices, protocol]);

  const grouped = useMemo(() => {
    if (!groupByProtocol) return null;
    return groupIdsByProtocol(allDevices);
  }, [allDevices, groupByProtocol]);

  const anchors = HOUSE_ROOMS;

  const showZigbeePairing = !protocol || protocol === "zigbee";
  const showZwavePairing = !protocol || protocol === "zwave";

  async function saveDeviceEdits(device: Device): Promise<DeviceActionState> {
    const trimmedName = editName.trim();
    const wifiTarget = wifiEntityRenameTarget(device.id);

    if (wifiTarget) {
      const named = await renameDeviceItem(wifiTarget.deviceId, wifiTarget.itemKey, trimmedName);
      if (named.error) return named;
      return updateDeviceOverride(device.id, {
        room: editRoom.trim() || null,
        role: editRole || null,
      });
    }

    await updateDeviceOverride(device.id, {
      display_name: trimmedName || undefined,
      room: editRoom.trim() || null,
      role: editRole || null,
    });
    if (trimmedName && trimmedName !== device.name) {
      if (device.protocol === "zigbee" || device.protocol === "zwave") {
        return renameHubDevice(device.id, trimmedName, device.node_id);
      }
    }
    return { ok: "Tallennettu." };
  }

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
      {controlFlash && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          {controlFlash}
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
              editRole={editRole}
              onEditStart={(d) => {
                setEditingId(d.id);
                setEditName(d.name);
                setEditRoom(d.room ?? "");
                setEditRole(d.roleOverride ?? "");
              }}
              onEditCancel={() => setEditingId(null)}
              onEditName={setEditName}
              onEditRoom={setEditRoom}
              onEditRole={setEditRole}
              onSave={(device) => {
                run(() => saveDeviceEdits(device));
                setEditingId(null);
              }}
              onHide={(id) => run(() => updateDeviceOverride(id, { hidden: true }))}
              onRefresh={() => void load()}
              onToggle={toggleDevice}
              busyId={busyId}
              effectiveOn={effectiveOn}
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
          editRole={editRole}
          onEditStart={(d) => {
            setEditingId(d.id);
            setEditName(d.name);
            setEditRoom(d.room ?? "");
            setEditRole(d.roleOverride ?? "");
          }}
          onEditCancel={() => setEditingId(null)}
          onEditName={setEditName}
          onEditRoom={setEditRoom}
          onEditRole={setEditRole}
          onSave={(device) => {
            run(() => saveDeviceEdits(device));
            setEditingId(null);
          }}
          onHide={(id) => run(() => updateDeviceOverride(id, { hidden: true }))}
          onRefresh={() => void load()}
          onToggle={toggleDevice}
          busyId={busyId}
          effectiveOn={effectiveOn}
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
          Valitse laitetyyppi Muokkaa-valikosta — se määrää näkyykö laite Valot-, Lämmitys- vai
          Turvallisuus-sivulla. Shelly, Tasmota ja implantit ovat oletuksena Muu ohjaus, eivät valoja.
        </p>
        <p className="mt-2">
          Valitse huone alasvetovalikosta — laite ilmestyy pohjakuvan oikeaan paikkaan. Huone voidaan
          myös päätellä laitteen nimestä (esim. &quot;eteinen_sauna&quot; → Eteinen).
        </p>
        <p className="mt-2">
          Kartta-ankkurit: {anchors.map((a) => a.label).join(", ")}.
        </p>
      </section>
    </div>
  );
}

function isZwaveNodeAggregate(device: Device): boolean {
  const parsed = parseZwaveDeviceId(device.id);
  return (
    device.protocol === "zwave" &&
    parsed != null &&
    parsed.endpoint === undefined &&
    /\d+\s*kanavaa/.test(device.capabilitiesLabel ?? "")
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
  editRole,
  onEditStart,
  onEditCancel,
  onEditName,
  onEditRoom,
  onEditRole,
  onSave,
  onHide,
  onRefresh,
  onToggle,
  busyId,
  effectiveOn,
  emptyText,
}: {
  title: string;
  devices: Device[];
  pending: boolean;
  editingId: string | null;
  editName: string;
  editRoom: string;
  editRole: DeviceRole | "";
  onEditStart: (d: Device) => void;
  onEditCancel: () => void;
  onEditName: (v: string) => void;
  onEditRoom: (v: string) => void;
  onEditRole: (v: DeviceRole | "") => void;
  onSave: (d: Device) => void;
  onHide: (id: string) => void;
  onRefresh: () => void;
  onToggle?: (device: Device, on: boolean) => void;
  busyId?: string | null;
  effectiveOn?: (device: Device) => boolean;
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
          {devices.map((device) => {
            const on = effectiveOn ? effectiveOn(device) : device.on;
            const busy = busyId === device.id;
            const showControl =
              device.controllable && onToggle && !isZwaveNodeAggregate(device);
            return (
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
                    <select
                      value={editRoom}
                      onChange={(e) => onEditRoom(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2"
                    >
                      <option value="">— Ei huonetta —</option>
                      {HOUSE_ROOMS.map((room) => (
                        <option key={room.id} value={room.label}>
                          {room.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm sm:col-span-2">
                    <span className="text-stone-600">Laitetyyppi</span>
                    <select
                      value={editRole}
                      onChange={(e) => onEditRole(e.target.value as DeviceRole | "")}
                      className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2"
                    >
                      <option value="">
                        Automaattinen
                        {device.inferredRole
                          ? ` (${deviceRoleLabel(device.inferredRole)})`
                          : " (päättele ominaisuuksista)"}
                      </option>
                      {DEVICE_ROLE_OPTIONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                          {opt.hint ? ` — ${opt.hint}` : ""}
                        </option>
                      ))}
                    </select>
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
                      {device.roleOverride
                        ? ` · ${deviceRoleLabel(device.role)}`
                        : ` · Automaattinen: ${deviceRoleLabel(device.inferredRole ?? device.role)}`}
                      {device.room ? ` · ${device.room}` : ""}
                      {device.readingLabel
                        ? ` · ${device.readingLabel}`
                        : !showControl && on
                          ? " · päällä"
                          : ""}
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] text-stone-400">{device.id}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {showControl && (
                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={`text-xs font-semibold ${
                            on ? "text-amber-700" : "text-stone-500"
                          }`}
                        >
                          {busy ? "Lähetetään…" : on ? "Päällä" : "Pois"}
                        </span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => onToggle!(device, true)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${
                              on
                                ? "bg-amber-400 text-amber-950 ring-2 ring-amber-500/40"
                                : "bg-stone-900 text-white hover:bg-stone-800"
                            }`}
                          >
                            Päälle
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => onToggle!(device, false)}
                            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${
                              !on
                                ? "border-stone-400 bg-stone-200 text-stone-900 ring-2 ring-stone-400/50"
                                : "border-stone-300 text-stone-800 hover:bg-stone-50"
                            }`}
                          >
                            Pois
                          </button>
                        </div>
                      </div>
                    )}
                    {!showControl && device.controllable === false && !device.readingLabel && (
                      <span className="text-xs text-stone-500">{on ? "Päällä" : "Pois"}</span>
                    )}
                    {(device.protocol === "zigbee" || device.protocol === "zwave") && (
                      <Link
                        href={
                          device.protocol === "zigbee"
                            ? LAITTEET.zigbeeDevice(device.id)
                            : LAITTEET.zwaveDevice(device.id)
                        }
                        className="rounded-lg border border-stone-900 px-3 py-1.5 text-xs font-semibold text-stone-900 hover:bg-stone-900 hover:text-white"
                      >
                        Avaa
                      </Link>
                    )}
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
            );
          })}
        </ul>
      )}
    </section>
  );
}
