"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { FloorPlanView } from "@/components/floor-plan-view";
import { LIGHT_ANCHORS } from "@/lib/lights-config";
import type { FloorPlanMarker } from "@/lib/floor-plan";
import { inferProtocolFromId, protocolLabel } from "@/lib/device-protocol";
import { kindLabel } from "@/lib/hub-lights";

type Device = {
  id: string;
  name: string;
  on: boolean;
  brightness: number | null;
  reachable: boolean;
  roomAnchorId: string | null;
  protocol: "zigbee" | "zwave" | "shelly" | "tasmota" | "airthings";
  kind: string;
  room: string | null;
  controllable: boolean;
  mqttSetTopic?: string | null;
  lockSetTopic?: string | null;
  locked?: boolean | null;
  capabilitiesLabel?: string;
  readingLabel?: string | null;
};

type LightsResponse = {
  configured: boolean;
  source?: "hub" | "mqtt" | null;
  hubOnline?: boolean;
  lights: Device[];
  switches?: Device[];
  sensors?: Device[];
  locks?: Device[];
  other?: Device[];
  devices?: Device[];
  message?: string;
  error?: string;
};

export function LightingPanel() {
  const [data, setData] = useState<LightsResponse | null>(null);
  const [, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [optimisticOn, setOptimisticOn] = useState<Record<string, boolean>>({});
  const [flash, setFlash] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/lights", { cache: "no-store" });
      const json = (await res.json()) as LightsResponse;
      setData(json);
    } catch {
      setData({
        configured: false,
        lights: [],
        error: "Yhteys API:in epäonnistui",
      });
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 5_000);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    if (!data) return;
    const all = [
      ...(data.lights ?? []),
      ...(data.switches ?? []),
      ...(data.locks ?? []),
      ...(data.other ?? []),
    ];
    setOptimisticOn((prev) => {
      if (Object.keys(prev).length === 0) return prev;
      const next = { ...prev };
      for (const d of all) {
        if (next[d.id] !== undefined && next[d.id] === d.on) {
          delete next[d.id];
        }
      }
      return next;
    });
  }, [data]);

  function toggle(device: Device, on: boolean) {
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
          setFlash(json.error ?? "Ohjaus epäonnistui");
          setOptimisticOn((prev) => {
            const next = { ...prev };
            delete next[device.id];
            return next;
          });
        } else {
          setFlash(null);
          void load();
        }
      } catch {
        setFlash("Ohjaus epäonnistui");
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

  const lights = data?.lights ?? [];
  const switches = data?.switches ?? [];
  const sensors = data?.sensors ?? [];
  const locks = data?.locks ?? [];
  const other = data?.other ?? [];

  function effectiveOn(device: Device): boolean {
    return optimisticOn[device.id] ?? device.on;
  }

  const markers: FloorPlanMarker[] = buildMarkers(lights, effectiveOn);

  return (
    <div className="mt-6 space-y-6">
      {!data?.configured && (
        <div
          className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"
          role="alert"
        >
          <p className="font-semibold">Laitteet eivät ole vielä synkassa</p>
          <p className="mt-1">
            Yellow synkkaa Zigbee- ja Z-Wave-laitteet hub-tilaan (~30 s). Varmista että synkki-agentti
            pyörii.
          </p>
        </div>
      )}

      {data?.configured && data.source === "hub" && data.hubOnline === false && (
        <div
          className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"
          role="status"
        >
          Yellow ei ole online — viimeisin tila näytetään kunnes yhteys palaa.
        </div>
      )}

      {data?.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900" role="alert">
          {data.error}
        </div>
      )}

      {flash && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900" role="status">
          {flash}
        </div>
      )}

      <FloorPlanView
        title="Valot kartalla"
        markers={markers}
        onMarkerClick={(anchorId) => {
          const light = lights.find((l) => l.roomAnchorId === anchorId);
          if (light?.controllable) toggle(light, !effectiveOn(light));
        }}
        footer={
          markers.length === 0 ? (
            <p className="border-t border-stone-200 bg-white px-4 py-3 text-xs text-stone-500">
              Kartalle tulee valot kun lisäät nimet tiedostoon{" "}
              <code className="text-stone-700">src/lib/lights-config.ts</code>.
            </p>
          ) : undefined
        }
      />

      <DeviceSection
        title="Valot"
        empty="Ei valoja — Zigbee, Z-Wave, Shelly ja Tasmota."
        devices={lights}
        busyId={busyId}
        onToggle={toggle}
        effectiveOn={effectiveOn}
        onRefresh={() => void load()}
      />

      <DeviceSection
        title="Kytkimet"
        empty="Ei ohjattavia kytkimiä — Shelly Pro 4, Tasmota 4-kanava jne."
        devices={switches}
        busyId={busyId}
        onToggle={toggle}
        effectiveOn={effectiveOn}
        readOnlyHint="Kaukosäädin — ei ohjattavissa webistä."
      />

      {locks.length > 0 && (
        <DeviceSection
          title="Lukot"
          empty=""
          devices={locks}
          busyId={busyId}
          onToggle={toggle}
          effectiveOn={effectiveOn}
          lockMode
        />
      )}

      {sensors.length > 0 && (
        <DeviceSection
          title="Anturit"
          empty=""
          devices={sensors}
          busyId={busyId}
          onToggle={toggle}
          effectiveOn={effectiveOn}
          sensorMode
        />
      )}

      {other.length > 0 && (
        <DeviceSection
          title="Muut laitteet"
          empty=""
          devices={other}
          busyId={busyId}
          onToggle={toggle}
          effectiveOn={effectiveOn}
          readOnlyHint="Näytetään tila — ohjaus protokollan mukaan."
        />
      )}
    </div>
  );
}

function DeviceSection({
  title,
  empty,
  devices,
  busyId,
  onToggle,
  effectiveOn,
  onRefresh,
  readOnlyHint,
  lockMode,
  sensorMode,
}: {
  title: string;
  empty: string;
  devices: Device[];
  busyId: string | null;
  onToggle: (device: Device, on: boolean) => void;
  effectiveOn: (device: Device) => boolean;
  onRefresh?: () => void;
  readOnlyHint?: string;
  lockMode?: boolean;
  sensorMode?: boolean;
}) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-stone-900">{title}</h2>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50"
          >
            Päivitä
          </button>
        )}
      </div>

      {devices.length === 0 ? (
        <p className="mt-4 text-sm text-stone-600">{empty}</p>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {devices.map((device) => {
            const on = effectiveOn(device);
            const busy = busyId === device.id;
            return (
            <li
              key={device.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-stone-900">{device.name}</p>
                <p className="truncate text-xs text-stone-500">
                  {protocolLabel(device.protocol)}
                  {device.room ? ` · ${device.room}` : ""}
                  {` · ${device.capabilitiesLabel || kindLabel(device.kind as "light")}`}
                  {device.readingLabel ? ` · ${device.readingLabel}` : ""}
                </p>
              </div>
              {sensorMode || (!device.controllable && !lockMode) ? (
                <span className="shrink-0 text-xs text-stone-500">
                  {device.readingLabel || (on ? "Päällä" : "Pois")}
                  {readOnlyHint ? " · ei ohjaus" : ""}
                </span>
              ) : lockMode && device.controllable ? (
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <StateBadge on={on} busy={busy} locked={device.locked} lockMode />
                  <div className="flex gap-1">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onToggle(device, false)}
                      className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                    >
                      Avaa
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onToggle(device, true)}
                      className="rounded-lg bg-stone-800 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      Lukitse
                    </button>
                  </div>
                </div>
              ) : device.controllable ? (
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <StateBadge on={on} busy={busy} />
                  <div className="flex gap-1">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onToggle(device, true)}
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
                      onClick={() => onToggle(device, false)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${
                        !on
                          ? "border-stone-400 bg-stone-200 text-stone-900 ring-2 ring-stone-400/50"
                          : "border-stone-300 text-stone-800 hover:bg-white"
                      }`}
                    >
                      Pois
                    </button>
                  </div>
                </div>
              ) : (
                <span className="shrink-0 text-xs text-stone-500">
                  {on ? "Päällä" : "Pois"}
                  {readOnlyHint ? " · ei ohjaus" : ""}
                </span>
              )}
            </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function StateBadge({
  on,
  busy,
  lockMode,
  locked,
}: {
  on: boolean;
  busy: boolean;
  lockMode?: boolean;
  locked?: boolean | null;
}) {
  const label = lockMode ? (locked ? "Lukossa" : "Auki") : on ? "Päällä" : "Pois";
  return (
    <span
      className={`text-xs font-semibold tabular-nums ${
        on || locked ? "text-amber-700" : "text-stone-500"
      }`}
    >
      {busy ? "Lähetetään…" : label}
    </span>
  );
}

function buildMarkers(
  lights: Device[],
  effectiveOn: (device: Device) => boolean,
): FloorPlanMarker[] {
  const byAnchor = new Map<string, Device>();
  for (const light of lights) {
    if (light.roomAnchorId) byAnchor.set(light.roomAnchorId, light);
  }

  return LIGHT_ANCHORS.map((anchor) => {
    const light = byAnchor.get(anchor.id);
    if (!light) {
      return { ...anchor, value: null, active: false, sub: null };
    }
    return {
      ...anchor,
      value: effectiveOn(light) ? "Päällä" : "Pois",
      active: effectiveOn(light),
      sub: light.brightness != null ? `${Math.round((light.brightness / 254) * 100)} %` : null,
    };
  }).filter((m) => m.value != null);
}
