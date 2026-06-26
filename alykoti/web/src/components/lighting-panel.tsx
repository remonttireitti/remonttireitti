"use client";

import { useCallback, useEffect, useState } from "react";
import { useHubCommandStatus } from "@/components/command-status-provider";
import { FloorPlanView } from "@/components/floor-plan-view";
import { LightMapDevicePopup } from "@/components/light-map-device-popup";
import { DeviceReadingsInline } from "@/components/device-readings-inline";
import { buildDeviceMarkers, type FloorPlanMarker } from "@/lib/floor-plan";
import type { DeviceReading } from "@/lib/capabilities";
import { inferProtocolFromId, protocolLabel } from "@/lib/device-protocol";
import { resolveHubDeviceReadings } from "@/lib/device-reading-metrics";
import { kindLabel } from "@/lib/hub-lights";
import { useMetricTrend } from "@/hooks/use-metric-trend";
import { lightControlCommandIds, sendLightControl } from "@/lib/light-control-send";

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
  readings?: DeviceReading[];
  temperature_c?: number | null;
  humidity_pct?: number | null;
  battery_pct?: number | null;
  co2_ppm?: number | null;
  illuminance_lux?: number | null;
  power_w?: number | null;
  voltage_v?: number | null;
  sensor_state?: string | null;
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
  const [optimisticOn, setOptimisticOn] = useState<Record<string, boolean>>({});
  const [flash, setFlash] = useState<string | null>(null);
  const [popupDevice, setPopupDevice] = useState<Device | null>(null);
  const { showTrend, modal } = useMetricTrend();
  const { trackCommandIds } = useHubCommandStatus();

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
    const all = [...(data.lights ?? []), ...(data.switches ?? [])];
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
    if (!device.controllable) return;
    setOptimisticOn((prev) => ({ ...prev, [device.id]: on }));
    void (async () => {
      try {
        const json = await sendLightControl({ id: device.id, on });
        if (!json.ok) {
          setFlash(json.error ?? "Ohjaus epäonnistui");
          setOptimisticOn((prev) => {
            const next = { ...prev };
            delete next[device.id];
            return next;
          });
        } else {
          setFlash(null);
          const ids = lightControlCommandIds(json);
          if (ids.length > 0) trackCommandIds(ids);
        }
      } catch {
        setFlash("Ohjaus epäonnistui");
        setOptimisticOn((prev) => {
          const next = { ...prev };
          delete next[device.id];
          return next;
        });
      }
    })();
  }

  const lights = data?.lights ?? [];
  const switches = data?.switches ?? [];

  function effectiveOn(device: Device): boolean {
    return optimisticOn[device.id] ?? device.on;
  }

  const mapDevices = [...lights, ...switches];
  const markers: FloorPlanMarker[] = buildDeviceMarkers(
    mapDevices.map((d) => ({
      id: d.id,
      name: d.name,
      roomAnchorId: d.roomAnchorId,
      on: effectiveOn(d),
      controllable: d.controllable,
    })),
    { pinMode: "bulb" },
  );

  function deviceFromMarker(marker: FloorPlanMarker): Device | undefined {
    const id = marker.deviceId;
    if (!id) return undefined;
    return mapDevices.find((d) => d.id === id);
  }

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
        onMarkerClick={(marker) => {
          const light = deviceFromMarker(marker);
          if (light?.controllable) toggle(light, !effectiveOn(light));
        }}
        onMarkerLongPress={(marker) => {
          const light = deviceFromMarker(marker);
          if (light) setPopupDevice(light);
        }}
        footer={
          markers.length === 0 ? (
            <p className="border-t border-stone-200 bg-white px-4 py-3 text-xs text-stone-500">
              Kartalle tulee valot kun valitset niille huoneen Asetuksissa (Laitteet → Muokkaa).
            </p>
          ) : (
            <p className="border-t border-stone-200 bg-white px-4 py-2 text-center text-[10px] text-stone-400">
              Napauta lamppua ohjataksesi · pitkä painallus asetuksiin
            </p>
          )
        }
      />

      {popupDevice && (
        <LightMapDevicePopup
          device={{
            ...popupDevice,
            on: effectiveOn(popupDevice),
            protocol: popupDevice.protocol,
          }}
          onClose={() => setPopupDevice(null)}
          onToggle={() => toggle(popupDevice, !effectiveOn(popupDevice))}
        />
      )}

      <DeviceSection
        title="Valot"
        empty="Ei valoja — valitse laitteelle tyyppi Valo Asetuksissa."
        devices={lights}
        onToggle={toggle}
        effectiveOn={effectiveOn}
        onRefresh={() => void load()}
        onShowTrend={showTrend}
      />

      <DeviceSection
        title="Valokytkimet"
        empty="Ei valokytkimiä."
        devices={switches}
        onToggle={toggle}
        effectiveOn={effectiveOn}
        readOnlyHint="Kaukosäädin — ei ohjattavissa webistä."
        onShowTrend={showTrend}
      />

      <p className="text-center text-xs text-stone-500">
        Shelly, Tasmota, lämmitys ja turvalaitteet löytyvät omilta sivuiltaan tai Asetuksista, jossa voit
        valita laitetyypin.
      </p>
      {modal}
    </div>
  );
}

function DeviceSection({
  title,
  empty,
  devices,
  onToggle,
  effectiveOn,
  onRefresh,
  readOnlyHint,
  lockMode,
  sensorMode,
  onShowTrend,
}: {
  title: string;
  empty: string;
  devices: Device[];
  onToggle: (device: Device, on: boolean) => void;
  effectiveOn: (device: Device) => boolean;
  onRefresh?: () => void;
  readOnlyHint?: string;
  lockMode?: boolean;
  sensorMode?: boolean;
  onShowTrend?: (metric: string) => void;
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
            const resolved = resolveHubDeviceReadings(device);
            return (
            <li
              key={device.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-stone-900">{device.name}</p>
                <p className="truncate text-xs text-stone-500">
                  {protocolLabel(device.protocol)}
                  {device.room ? ` · ${device.room}` : ""}
                  {` · ${device.capabilitiesLabel || kindLabel(device.kind as "light")}`}
                </p>
                {resolved.length > 0 && onShowTrend && (
                  <DeviceReadingsInline readings={resolved} onShowTrend={onShowTrend} />
                )}
              </div>
              {sensorMode || (!device.controllable && !lockMode) ? (
                <span
                  className={`shrink-0 text-right ${
                    resolved.length > 0
                      ? "max-w-[55%] text-sm font-medium tabular-nums text-stone-800"
                      : "text-xs text-stone-500"
                  }`}
                >
                  {resolved.length === 0 ? (on ? "Päällä" : "Pois") : null}
                  {readOnlyHint && resolved.length === 0 ? " · ei ohjaus" : ""}
                </span>
              ) : lockMode && device.controllable ? (
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <StateBadge on={on} locked={device.locked} lockMode />
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => onToggle(device, false)}
                      className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                    >
                      Avaa
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggle(device, true)}
                      className="rounded-lg bg-stone-800 px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      Lukitse
                    </button>
                  </div>
                </div>
              ) : device.controllable ? (
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <StateBadge on={on} />
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => onToggle(device, true)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                        on
                          ? "bg-amber-400 text-amber-950 ring-2 ring-amber-500/40"
                          : "bg-stone-900 text-white hover:bg-stone-800"
                      }`}
                    >
                      Päälle
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggle(device, false)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
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
                <span
                  className={`shrink-0 text-right ${
                    resolved.length > 0
                      ? "max-w-[55%] text-sm font-medium tabular-nums text-stone-800"
                      : "text-xs text-stone-500"
                  }`}
                >
                  {resolved.length === 0 ? (on ? "Päällä" : "Pois") : null}
                  {readOnlyHint && resolved.length === 0 ? " · ei ohjaus" : ""}
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
  lockMode,
  locked,
}: {
  on: boolean;
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
      {label}
    </span>
  );
}
