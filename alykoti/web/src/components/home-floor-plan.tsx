"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { FloorPlanView } from "@/components/floor-plan-view";
import { LightMapDevicePopup } from "@/components/light-map-device-popup";
import { buildDeviceMarkers, type FloorPlanMarker } from "@/lib/floor-plan";
import { LIGHT_PAGE_ROLES } from "@/lib/device-roles";
import type { DeviceRole } from "@/lib/device-roles";
import type { Hub } from "@/lib/types";

type Device = {
  id: string;
  name: string;
  on: boolean;
  room: string | null;
  roomAnchorId?: string | null;
  brightness?: number | null;
  controllable: boolean;
  role?: DeviceRole;
  protocol?: string;
};

type Props = {
  hub: Hub | null;
};

export function HomeFloorPlan({ hub }: Props) {
  void hub;
  const [devices, setDevices] = useState<Device[]>([]);
  const [optimisticOn, setOptimisticOn] = useState<Record<string, boolean>>({});
  const [popupDevice, setPopupDevice] = useState<Device | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/home/devices", { cache: "no-store" });
      const json = (await res.json()) as { devices?: Device[] };
      setDevices(json.devices ?? []);
    } catch {
      setDevices([]);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 10_000);
    return () => clearInterval(id);
  }, [load]);

  const lights = devices.filter(
    (d) => d.roomAnchorId && d.role && LIGHT_PAGE_ROLES.includes(d.role),
  );

  function effectiveOn(device: Device): boolean {
    return optimisticOn[device.id] ?? device.on;
  }

  function toggle(device: Device) {
    if (!device.controllable || busyId === device.id) return;
    const next = !effectiveOn(device);
    setOptimisticOn((prev) => ({ ...prev, [device.id]: next }));
    setBusyId(device.id);
    startTransition(async () => {
      try {
        const res = await fetch("/api/lights/control", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: device.id, on: next }),
        });
        const json = (await res.json()) as { ok?: boolean };
        if (json.ok) {
          setPopupDevice((prev) => (prev?.id === device.id ? { ...prev, on: next } : prev));
          void load();
        } else {
          setOptimisticOn((prev) => {
            const n = { ...prev };
            delete n[device.id];
            return n;
          });
        }
      } finally {
        setBusyId(null);
      }
    });
  }

  function deviceFromMarker(marker: FloorPlanMarker): Device | undefined {
    const id = marker.deviceId;
    if (!id) return undefined;
    return lights.find((d) => d.id === id);
  }

  const markers = buildDeviceMarkers(
    lights.map((d) => ({
      id: d.id,
      name: d.name,
      roomAnchorId: d.roomAnchorId ?? null,
      on: effectiveOn(d),
      controllable: d.controllable,
    })),
    { kind: "light", pinMode: "bulb" },
  );

  return (
    <>
      <FloorPlanView
        title="Koti"
        markers={markers}
        hideHeader
        onMarkerClick={(marker) => {
          const device = deviceFromMarker(marker);
          if (device?.controllable) toggle(device);
        }}
        onMarkerLongPress={(marker) => {
          const device = deviceFromMarker(marker);
          if (device) setPopupDevice(device);
        }}
        footer={
          markers.length === 0 ? (
            <p className="border-t border-stone-200 bg-white px-4 py-3 text-xs text-stone-500">
              Valot kartalla kun niille on valittu huone ja tyyppi Valo Asetuksissa.
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
          device={{ ...popupDevice, on: effectiveOn(popupDevice) }}
          onClose={() => setPopupDevice(null)}
          onToggle={() => toggle(popupDevice)}
        />
      )}
    </>
  );
}
