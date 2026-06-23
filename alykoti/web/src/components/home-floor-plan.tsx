"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { FloorPlanView } from "@/components/floor-plan-view";
import { LightMapDevicePopup } from "@/components/light-map-device-popup";
import { buildDeviceMarkers, type FloorPlanMarker } from "@/lib/floor-plan";
import {
  deviceIdForPin,
  pinsToMarkers,
  type FloorPlanDeviceSnapshot,
  type FloorPlanPin,
} from "@/lib/floor-plan-pins";
import { LIGHT_PAGE_ROLES } from "@/lib/device-roles";
import type { DeviceRole } from "@/lib/device-roles";
import type { Hub } from "@/lib/types";
import Link from "next/link";

type Device = FloorPlanDeviceSnapshot & {
  room: string | null;
  roomAnchorId?: string | null;
  role?: DeviceRole;
  protocol?: string;
  brightness?: number | null;
};

type Props = {
  hub: Hub | null;
};

export function HomeFloorPlan({ hub }: Props) {
  void hub;
  const router = useRouter();
  const [devices, setDevices] = useState<Device[]>([]);
  const [pins, setPins] = useState<FloorPlanPin[]>([]);
  const [optimisticOn, setOptimisticOn] = useState<Record<string, boolean>>({});
  const [popupDevice, setPopupDevice] = useState<Device | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/floor-plan", { cache: "no-store" });
      const json = (await res.json()) as {
        devices?: Device[];
        pins?: FloorPlanPin[];
      };
      setDevices(json.devices ?? []);
      setPins(json.pins ?? []);
    } catch {
      setDevices([]);
      setPins([]);
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

  function effectiveOnId(id: string): boolean {
    const device = devices.find((d) => d.id === id);
    return optimisticOn[id] ?? device?.on ?? false;
  }

  function deviceById(id: string | null | undefined): Device | undefined {
    if (!id) return undefined;
    return devices.find((d) => d.id === id);
  }

  function toggleDevice(device: Device) {
    if (!device.controllable || busyId === device.id) return;
    const next = !effectiveOnId(device.id);
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

  function runPinAction(pin: FloorPlanPin) {
    if (pin.action.type === "toggle") {
      const device = deviceById(pin.action.deviceId);
      if (device?.controllable) toggleDevice(device);
      return;
    }
    if (pin.action.type === "navigate") {
      router.push(pin.action.href);
      return;
    }
    if (pin.action.type === "open_link") {
      window.open(pin.action.href, "_blank", "noopener,noreferrer");
    }
  }

  function deviceFromMarker(marker: FloorPlanMarker): Device | undefined {
    const id = marker.deviceId;
    if (!id) return undefined;
    return deviceById(id);
  }

  const useCustomPins = pins.length > 0;
  const markers: FloorPlanMarker[] = useCustomPins
    ? pinsToMarkers(pins, devices, effectiveOnId)
    : buildDeviceMarkers(
        lights.map((d) => ({
          id: d.id,
          name: d.name,
          roomAnchorId: d.roomAnchorId ?? null,
          on: effectiveOnId(d.id),
          controllable: d.controllable,
        })),
        { kind: "light", pinMode: "bulb" },
      );

  function onMarkerClick(marker: FloorPlanMarker) {
    if (useCustomPins) {
      const pin = pins.find((p) => p.id === marker.id);
      if (pin) runPinAction(pin);
      return;
    }
    const device = deviceFromMarker(marker);
    if (device?.controllable) toggleDevice(device);
  }

  function onMarkerLongPress(marker: FloorPlanMarker) {
    const device = deviceFromMarker(marker);
    if (device) setPopupDevice(device);
    else {
      const pin = pins.find((p) => p.id === marker.id);
      const linked = pin ? deviceById(deviceIdForPin(pin)) : undefined;
      if (linked) setPopupDevice(linked);
    }
  }

  return (
    <>
      <FloorPlanView
        title="Koti"
        markers={markers}
        hideHeader
        onMarkerClick={onMarkerClick}
        onMarkerLongPress={onMarkerLongPress}
        footer={
          markers.length === 0 ? (
            <p className="border-t border-stone-200 bg-white px-4 py-3 text-xs text-stone-500">
              {useCustomPins ? (
                <>
                  Ei näkyviä pisteitä.{" "}
                  <Link href="/laitteet/pohjakuva" className="font-medium text-stone-700 underline">
                    Muokkaa pohjakuvaa
                  </Link>
                </>
              ) : (
                <>
                  Valot kartalla kun niille on valittu huone ja tyyppi Valo — tai{" "}
                  <Link href="/laitteet/pohjakuva" className="font-medium text-stone-700 underline">
                    luo oma kartta
                  </Link>
                  .
                </>
              )}
            </p>
          ) : (
            <p className="border-t border-stone-200 bg-white px-4 py-2 text-center text-[10px] text-stone-400">
              Napauta ohjataksesi · pitkä painallus asetuksiin ·{" "}
              <Link href="/laitteet/pohjakuva" className="underline">
                muokkaa karttaa
              </Link>
            </p>
          )
        }
      />

      {popupDevice && (
        <LightMapDevicePopup
          device={{ ...popupDevice, on: effectiveOnId(popupDevice.id) }}
          onClose={() => setPopupDevice(null)}
          onToggle={() => toggleDevice(popupDevice)}
        />
      )}
    </>
  );
}
