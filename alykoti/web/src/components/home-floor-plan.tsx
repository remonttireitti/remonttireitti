"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { expandMirrorCommandIds } from "@/lib/automation-presets";
import { useHubCommandStatus } from "@/components/command-status-provider";
import { FloorPlanView } from "@/components/floor-plan-view";
import { LightMapDevicePopup } from "@/components/light-map-device-popup";
import { type FloorPlanMarker } from "@/lib/floor-plan";
import {
  deviceIdForPin,
  mergeFloorPlanMarkers,
  type FloorPlanDeviceSnapshot,
  type FloorPlanPin,
} from "@/lib/floor-plan-pins";
import { LIGHT_PAGE_ROLES } from "@/lib/device-roles";
import type { DeviceRole } from "@/lib/device-roles";
import { lightControlCommandIds, sendLightControl } from "@/lib/light-control-send";
import { POLL_FLOOR_PLAN_MS } from "@/lib/poll-intervals";
import type { Hub } from "@/lib/types";
import Link from "next/link";

type Device = FloorPlanDeviceSnapshot & {
  room: string | null;
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
  const [statusHint, setStatusHint] = useState<string | null>(null);
  const { trackCommandIds } = useHubCommandStatus();

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
    const id = setInterval(() => void load(), POLL_FLOOR_PLAN_MS);
    return () => clearInterval(id);
  }, [load]);

  const mapDevices = devices.filter(
    (d) => d.roomAnchorId && (!d.role || LIGHT_PAGE_ROLES.includes(d.role)),
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
    if (!device.controllable) return;
    const next = !effectiveOnId(device.id);
    const affectedIds = expandMirrorCommandIds(device.id);
    setOptimisticOn((prev) => {
      const n = { ...prev };
      for (const affectedId of affectedIds) n[affectedId] = next;
      return n;
    });
    setPopupDevice((prev) => (prev?.id === device.id ? { ...prev, on: next } : prev));

    void (async () => {
      try {
        const json = await sendLightControl({ id: device.id, on: next });
        if (!json.ok) {
          setOptimisticOn((prev) => {
            const n = { ...prev };
            for (const affectedId of affectedIds) delete n[affectedId];
            return n;
          });
          setStatusHint(json.error ?? "Ohjaus epäonnistui");
          return;
        }
        setStatusHint(null);
        const ids = lightControlCommandIds(json);
        if (ids.length > 0) trackCommandIds(ids);
      } catch {
        setOptimisticOn((prev) => {
          const n = { ...prev };
          for (const affectedId of affectedIds) delete n[affectedId];
          return n;
        });
        setStatusHint("Ohjaus epäonnistui");
      }
    })();
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

  const markers = mergeFloorPlanMarkers(
    pins,
    mapDevices,
    devices,
    effectiveOnId,
    { kind: "light", pinMode: "bulb" },
  );

  function onMarkerClick(marker: FloorPlanMarker) {
    const pin = pins.find((p) => p.id === marker.id);
    if (pin && pin.action.type !== "none") {
      runPinAction(pin);
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
          <>
            {statusHint && (
              <p className="border-t border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-900">
                {statusHint}
              </p>
            )}
            {markers.length === 0 ? (
              <p className="border-t border-stone-200 bg-white px-4 py-3 text-xs text-stone-500">
                Valot kartalla kun niille on valittu huone — tai{" "}
                <Link href="/laitteet/pohjakuva" className="font-medium text-stone-700 underline">
                  luo oma kartta
                </Link>
                .
              </p>
            ) : (
              <p className="border-t border-stone-200 bg-white px-4 py-2 text-center text-[10px] text-stone-400">
                Napauta ohjataksesi · pitkä painallus asetuksiin ·{" "}
                <Link href="/laitteet/pohjakuva" className="underline">
                  muokkaa karttaa
                </Link>
              </p>
            )}
          </>
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
