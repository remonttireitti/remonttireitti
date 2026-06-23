"use client";

import Link from "next/link";
import { FloorPlanView } from "@/components/floor-plan-view";
import { useDeviceStatus } from "@/hooks/use-device-status";
import { useMetricTrend } from "@/hooks/use-metric-trend";
import { hubLastSeenLabel, isHubOnline, connectivityLevel } from "@/lib/device-status";
import { inferAirfiOnline } from "@/lib/airfi-telemetry";
import { VENTILATION_ROOM_IDS, type FloorPlanMarker } from "@/lib/floor-plan";
import { roomById } from "@/lib/rooms";
import type { Hub } from "@/lib/types";
import { getCo2Band, getCo2BandLabel } from "@/lib/ventilation-logic";

const MODE_LABELS = {
  auto: "Automaatti",
  manual: "Manuaali",
  fireplace: "Takkatila",
  hood: "Liesituuletin",
} as const;

type Props = {
  hub: Hub;
  settingsHref: string;
};

export function VentilationFloorPlan({ hub, settingsHref }: Props) {
  const { status } = useDeviceStatus();
  const { showTrend, modal } = useMetricTrend();
  const s = hub.state;

  const hubOnline = status?.hub.online ?? isHubOnline(hub.last_seen_at);
  const airfiOnline =
    status?.airfi.online ??
    inferAirfiOnline(hubOnline, hub.state, hub.state.airfi_online, hub.last_seen_at);
  const level =
    status?.level ??
    connectivityLevel(
      {
        online: hubOnline,
        last_seen_at: hub.last_seen_at,
        last_seen_label: hubLastSeenLabel(hub.last_seen_at, hubOnline),
      },
      { online: airfiOnline, source: "hub" },
    );
  const co2Band = s.co2_ppm != null ? getCo2Band(s.co2_ppm, hub.config) : null;

  const markers: FloorPlanMarker[] = [];

  const fansRoom = roomById(VENTILATION_ROOM_IDS.fans);
  if (fansRoom) {
    const supply = s.fan_supply_pct;
    const exhaust = s.fan_exhaust_pct;
    markers.push({
      id: fansRoom.id,
      label: fansRoom.label,
      left: fansRoom.left,
      top: fansRoom.top,
      kind: "ventilation",
      value: supply != null ? `${Math.round(supply)} %` : "—",
      sub:
        exhaust != null
          ? `Poisto ${Math.round(exhaust)} %`
          : airfiOnline
            ? "AirFi"
            : undefined,
      active: airfiOnline,
    });
  }

  const co2Room = roomById(VENTILATION_ROOM_IDS.co2);
  if (co2Room && s.co2_ppm != null) {
    markers.push({
      id: co2Room.id,
      label: co2Room.label,
      left: co2Room.left,
      top: co2Room.top,
      kind: "sensor",
      value: `${Math.round(s.co2_ppm)} ppm`,
      sub: "CO₂",
      active: co2Band === "high" || co2Band === "max",
    });
  }

  const alert =
    status && level === "degraded" ? (
      <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-950">
        <span className="font-semibold">
          {!status.hub.online
            ? "Keskusyksikkö offline"
            : !airfiOnline
              ? "Ei tuoretta AirFi-dataa"
              : "Hub ei saa yhteyttä AirFiin"}
        </span>
        {status.message && <span className="ml-2">{status.message}</span>}
      </div>
    ) : status && level === "offline" ? (
      <div className="border-b border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-950">
        <span className="font-semibold">AirFi ei vastaa</span>
        {status.message && <span className="ml-2">{status.message}</span>}
      </div>
    ) : null;

  return (
    <>
      {modal}
      {alert}
      <FloorPlanView
        title="Ilmanvaihto"
        markers={markers}
        onMarkerClick={(id) => {
          if (id === VENTILATION_ROOM_IDS.co2) showTrend("co2_ppm");
          if (id === VENTILATION_ROOM_IDS.fans) showTrend("fan_supply_pct");
        }}
        headerRight={
          <Link
            href={settingsHref}
            className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50"
          >
            Asetukset
          </Link>
        }
        footer={
          <div className="border-t border-stone-200 bg-white px-4 py-3">
            <div className="grid grid-cols-2 gap-3 text-center text-sm sm:grid-cols-4">
              <Metric label="CO₂" value={s.co2_ppm != null ? `${Math.round(s.co2_ppm)} ppm` : "—"} onClick={() => showTrend("co2_ppm")} />
              <Metric label="Kosteus" value={s.humidity_pct != null ? `${Math.round(s.humidity_pct)} %` : "—"} onClick={() => showTrend("humidity_pct")} />
              <Metric label="PM2.5" value={s.pm25_ugm3 != null ? s.pm25_ugm3.toFixed(1) : "—"} onClick={() => showTrend("pm25_ugm3")} />
              <Metric label="Huone" value={s.temperature_c != null ? `${s.temperature_c.toFixed(1)} °C` : "—"} onClick={() => showTrend("temperature_c")} />
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 border-t border-stone-100 pt-3">
              <StatusPill ok={hubOnline} warn={!hubOnline} label={hubOnline ? "Hub online" : hubLastSeenLabel(hub.last_seen_at, hubOnline)} />
              <StatusPill ok={airfiOnline} warn={!airfiOnline} label={airfiOnline ? "AirFi (hub)" : "AirFi offline"} />
              <StatusPill label={MODE_LABELS[hub.control_mode]} ok={hub.control_mode === "auto"} />
              {co2Band && (
                <StatusPill label={getCo2BandLabel(co2Band)} warn={co2Band === "high" || co2Band === "max"} ok={co2Band === "normal"} />
              )}
            </div>
          </div>
        }
      />
    </>
  );
}

function Metric({
  label,
  value,
  onClick,
}: {
  label: string;
  value: string;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="rounded-lg py-1 transition hover:bg-stone-50">
      <p className="text-[10px] font-medium uppercase tracking-wide text-stone-500">{label}</p>
      <p className="font-semibold text-stone-900">{value}</p>
    </button>
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
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>{label}</span>;
}
