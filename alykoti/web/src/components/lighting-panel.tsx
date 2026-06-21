"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { FloorPlanView } from "@/components/floor-plan-view";
import { LIGHT_ANCHORS } from "@/lib/lights-config";
import type { FloorPlanMarker } from "@/lib/floor-plan";
import { kindLabel } from "@/lib/hub-lights";

type Device = {
  id: string;
  name: string;
  on: boolean;
  brightness: number | null;
  reachable: boolean;
  roomAnchorId: string | null;
  protocol: "zigbee" | "zwave";
  kind: string;
  room: string | null;
  controllable: boolean;
  mqttSetTopic?: string | null;
};

type LightsResponse = {
  configured: boolean;
  source?: "hub" | "mqtt" | null;
  hubOnline?: boolean;
  lights: Device[];
  switches?: Device[];
  other?: Device[];
  devices?: Device[];
  message?: string;
  error?: string;
};

export function LightingPanel() {
  const [data, setData] = useState<LightsResponse | null>(null);
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
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

  function toggle(device: Device) {
    if (pending || !device.controllable) return;
    setBusyId(device.id);
    startTransition(async () => {
      try {
        const res = await fetch("/api/lights/control", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: device.id, on: !device.on }),
        });
        const json = (await res.json()) as { ok?: boolean; error?: string };
        if (!json.ok) {
          setFlash(json.error ?? "Ohjaus epäonnistui");
        } else {
          setFlash(null);
          await load();
        }
      } catch {
        setFlash("Ohjaus epäonnistui");
      } finally {
        setBusyId(null);
      }
    });
  }

  const lights = data?.lights ?? [];
  const switches = data?.switches ?? [];
  const other = data?.other ?? [];
  const markers: FloorPlanMarker[] = buildMarkers(lights);

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
          if (light) toggle(light);
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
        empty="Ei valoja — Zigbee (SkyConnect) + Z-Wave (Z-Pi 7)."
        devices={lights}
        pending={pending}
        busyId={busyId}
        onToggle={toggle}
        onRefresh={() => void load()}
      />

      <DeviceSection
        title="Kytkimet"
        empty="Ei kytkimiä — esim. Zigbee-valosäädin (MH valosäätin) tai Z-Wave-seinäkytkin."
        devices={switches}
        pending={pending}
        busyId={busyId}
        onToggle={toggle}
        readOnlyHint="Kaukosäädin — ei ohjattavissa webistä."
      />

      {other.length > 0 && (
        <DeviceSection
          title="Muut laitteet"
          empty=""
          devices={other}
          pending={pending}
          busyId={busyId}
          onToggle={toggle}
          readOnlyHint="Näytetään tila — ohjaus tulossa."
        />
      )}
    </div>
  );
}

function DeviceSection({
  title,
  empty,
  devices,
  pending,
  busyId,
  onToggle,
  onRefresh,
  readOnlyHint,
}: {
  title: string;
  empty: string;
  devices: Device[];
  pending: boolean;
  busyId: string | null;
  onToggle: (device: Device) => void;
  onRefresh?: () => void;
  readOnlyHint?: string;
}) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-stone-900">{title}</h2>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={pending}
            className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
          >
            Päivitä
          </button>
        )}
      </div>

      {devices.length === 0 ? (
        <p className="mt-4 text-sm text-stone-600">{empty}</p>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {devices.map((device) => (
            <li
              key={device.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-stone-900">{device.name}</p>
                <p className="truncate text-xs text-stone-500">
                  {device.protocol === "zwave" ? "Z-Wave" : "Zigbee"}
                  {device.room ? ` · ${device.room}` : ""}
                  {` · ${kindLabel(device.kind as "light")}`}
                </p>
              </div>
              {device.controllable ? (
                <button
                  type="button"
                  disabled={pending && busyId === device.id}
                  onClick={() => onToggle(device)}
                  className={`shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    device.on
                      ? "bg-amber-400 text-amber-950 hover:bg-amber-300"
                      : "bg-stone-800 text-white hover:bg-stone-700"
                  } disabled:opacity-50`}
                >
                  {busyId === device.id ? "…" : device.on ? "Pois" : "Päälle"}
                </button>
              ) : (
                <span className="shrink-0 text-xs text-stone-500">
                  {device.on ? "Päällä" : "Pois"}
                  {readOnlyHint ? " · ei ohjaus" : ""}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function buildMarkers(lights: Device[]): FloorPlanMarker[] {
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
      value: light.on ? "Päällä" : "Pois",
      active: light.on,
      sub: light.brightness != null ? `${Math.round((light.brightness / 254) * 100)} %` : null,
    };
  }).filter((m) => m.value != null);
}
