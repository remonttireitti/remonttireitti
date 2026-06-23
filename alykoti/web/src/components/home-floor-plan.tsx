"use client";

import { useCallback, useEffect, useState } from "react";
import { FloorPlanView } from "@/components/floor-plan-view";
import { buildDeviceMarkers } from "@/lib/floor-plan";
import type { Hub } from "@/lib/types";

type Device = {
  id: string;
  name: string;
  on: boolean;
  room: string | null;
  roomAnchorId?: string | null;
  brightness?: number | null;
  readingLabel?: string | null;
  controllable: boolean;
  role?: string;
};

type Props = {
  hub: Hub | null;
};

export function HomeFloorPlan({ hub }: Props) {
  void hub;
  const [devices, setDevices] = useState<Device[]>([]);

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

  const withRoom = devices.filter((d) => d.roomAnchorId);
  const markers = buildDeviceMarkers(
    withRoom.map((d) => ({
      id: d.id,
      name: d.name,
      roomAnchorId: d.roomAnchorId ?? null,
      on: d.on,
      brightness: d.brightness,
      readingLabel: d.readingLabel,
      controllable: d.controllable,
    })),
    { kind: "device" },
  );

  return (
    <FloorPlanView
      title="Koti"
      markers={markers}
      hideHeader
      footer={
        markers.length === 0 ? (
          <p className="border-t border-stone-200 bg-white px-4 py-3 text-xs text-stone-500">
            Laitteet näkyvät kartalla kun niille on valittu huone Asetuksissa.
          </p>
        ) : undefined
      }
    />
  );
}
