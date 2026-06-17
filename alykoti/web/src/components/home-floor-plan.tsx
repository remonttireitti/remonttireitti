"use client";

import Link from "next/link";
import { FloorPlanView } from "@/components/floor-plan-view";
import { useDeviceStatus } from "@/hooks/use-device-status";
import { hubLastSeenLabel, isHubOnline } from "@/lib/device-status";
import { FLOOR_PLAN_ANCHORS, type FloorPlanMarker } from "@/lib/floor-plan";
import type { Hub } from "@/lib/types";
import { getCo2BandLabel, getCo2Band } from "@/lib/ventilation-logic";

type Props = {
  hub: Hub | null;
  settingsHref?: string;
};

export function HomeFloorPlan({ hub, settingsHref = "/ilmanvaihto/asetukset" }: Props) {
  const { status } = useDeviceStatus();
  const s = hub?.state;
  const hubOnline = hub
    ? (status?.hub.online ?? isHubOnline(hub.last_seen_at))
    : false;
  const airfiOnline = status?.airfi.online ?? false;
  const co2Band =
    s?.co2_ppm != null && hub ? getCo2Band(s.co2_ppm, hub.config) : null;

  const markers: FloorPlanMarker[] = FLOOR_PLAN_ANCHORS.map((anchor) => {
    if (!hub || !s) return { ...anchor, value: null };

    if (anchor.id === "living") {
      const parts: string[] = [];
      if (s.co2_ppm != null) parts.push(`${Math.round(s.co2_ppm)} ppm`);
      if (s.temperature_c != null) parts.push(`${s.temperature_c.toFixed(1)} °C`);
      return {
        ...anchor,
        kind: "sensor",
        value: parts[0] ?? null,
        sub:
          parts.length > 1
            ? parts.slice(1).join(" · ")
            : s.humidity_pct != null
              ? `${Math.round(s.humidity_pct)} %`
              : "CO₂",
        active: co2Band === "high" || co2Band === "max",
      };
    }
    if (anchor.id === "utility") {
      return {
        ...anchor,
        kind: "ventilation",
        value: airfiOnline ? "AirFi" : "—",
        sub: s.fan_supply_pct != null ? `Tulo ${Math.round(s.fan_supply_pct)} %` : undefined,
        active: airfiOnline,
      };
    }
    return { ...anchor, value: null };
  });

  const footer = hub ? (
    <div className="border-t border-stone-200 bg-white/95 px-4 py-3">
      <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
        <StatusPill
          ok={hubOnline}
          warn={!hubOnline}
          label={hubOnline ? "Hub online" : hubLastSeenLabel(hub.last_seen_at, hubOnline)}
        />
        <StatusPill
          ok={airfiOnline}
          warn={!airfiOnline}
          label={airfiOnline ? "AirFi (hub)" : "AirFi offline"}
        />
        <StatusPill label={hub.control_mode === "auto" ? "Automaatti" : hub.control_mode} ok={hub.control_mode === "auto"} />
        {co2Band && (
          <StatusPill
            label={getCo2BandLabel(co2Band)}
            warn={co2Band === "high" || co2Band === "max"}
            ok={co2Band === "normal"}
          />
        )}
      </div>
    </div>
  ) : (
    <div className="border-t border-stone-200 bg-white px-4 py-4 text-sm text-stone-600">
      Lisää keskusyksikkö nähdäksesi anturidatan pohjapiirroksella.
    </div>
  );

  return (
    <FloorPlanView
      title="Koti"
      markers={markers}
      footer={footer}
      headerRight={
        <Link
          href={settingsHref}
          className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50"
        >
          Asetukset
        </Link>
      }
    />
  );
}

function StatusPill({
  label,
  ok,
  warn,
}: {
  label: string;
  ok?: boolean;
  warn?: boolean;
}) {
  const cls = warn
    ? "bg-amber-100 text-amber-900"
    : ok
      ? "bg-emerald-100 text-emerald-800"
      : "bg-stone-100 text-stone-600";
  return (
    <span className={`rounded-full px-2.5 py-0.5 font-medium ${cls}`}>{label}</span>
  );
}
