"use client";

import Image from "next/image";
import Link from "next/link";
import { useDeviceStatus } from "@/hooks/use-device-status";
import { useMetricTrend } from "@/hooks/use-metric-trend";
import { hubLastSeenLabel, isHubOnline, connectivityLevel } from "@/lib/device-status";
import { inferAirfiOnline } from "@/lib/airfi-telemetry";
import type { Hub } from "@/lib/types";
import { getCo2BandLabel, getCo2Band } from "@/lib/ventilation-logic";

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

export function VentilationDiagram({ hub, settingsHref }: Props) {
  const { status } = useDeviceStatus();
  const { showTrend, modal } = useMetricTrend();

  const live = status?.live;
  const s = {
    ...hub.state,
    fan_supply_pct: live?.fan_supply_pct ?? hub.state.fan_supply_pct,
    fan_exhaust_pct: live?.fan_exhaust_pct ?? hub.state.fan_exhaust_pct,
    fan_supply_target: live?.fan_supply_target ?? hub.state.fan_supply_target,
    fan_exhaust_target: live?.fan_exhaust_target ?? hub.state.fan_exhaust_target,
    lto_temp_efficiency_pct: live?.lto_temp_efficiency_pct ?? hub.state.lto_temp_efficiency_pct,
    lto_energy_efficiency_pct: live?.lto_energy_efficiency_pct ?? hub.state.lto_energy_efficiency_pct,
  };
  const co2Band = s.co2_ppm != null ? getCo2Band(s.co2_ppm, hub.config) : null;
  const supplyTemp = s.supply_room_temp_c;

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
  const onlineLabel =
    status?.hub.last_seen_label ??
    hubLastSeenLabel(hub.last_seen_at, isHubOnline(hub.last_seen_at));

  return (
    <>
      {modal}
      <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        {status && level === "degraded" && (
          <div
            role="status"
            className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-950"
          >
            <span className="font-semibold">
              {!status.hub.online
                ? "Keskusyksikkö offline"
                : !airfiOnline
                  ? "Ei tuoretta AirFi-dataa"
                  : "Hub ei saa yhteyttä AirFiin"}
            </span>
            {status.message && (
              <>
                <span className="mx-2 text-amber-300">·</span>
                {status.message}
              </>
            )}
          </div>
        )}
        {status && level === "offline" && (
          <div
            role="alert"
            className="border-b border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-950"
          >
            <span className="font-semibold">AirFi ei vastaa</span>
            {status.message && (
              <>
                <span className="mx-2 text-red-300">·</span>
                {status.message}
              </>
            )}
          </div>
        )}

        <div className="relative aspect-[16/10] w-full min-h-[280px] sm:min-h-[360px]">
          <Image
            src="/images/ilmanvaihto-diagram.png"
            alt="Ilmanvaihdon kaavio"
            fill
            priority
            className="object-contain p-2 sm:p-4"
            sizes="(max-width: 768px) 100vw, 896px"
          />

          <Link
            href={settingsHref}
            className="absolute right-2 top-2 z-20 flex items-center gap-1.5 rounded-full border border-stone-200 bg-white/95 px-3 py-1.5 text-xs font-semibold text-stone-700 shadow-sm backdrop-blur hover:bg-stone-50 sm:right-4 sm:top-4 sm:text-sm"
            title="Automaatioasetukset"
          >
            <GearIcon />
            Asetukset
          </Link>

          <DiagramBadge
            label="Ulkoilma T1"
            value={formatTemp(s.outdoor_temp_c)}
            left="82%"
            top="5%"
            tone="cold"
            onTrend={() => showTrend("outdoor_temp_c")}
          />
          <DiagramBadge
            label="Jäteilma T4"
            value={formatTemp(s.exhaust_hru_temp_c)}
            left="14%"
            top="5%"
            tone="warm"
            onTrend={() => showTrend("exhaust_hru_temp_c")}
          />
          <DiagramBadge
            label="Tulo T5"
            value={formatTemp(supplyTemp)}
            left="22%"
            top="46%"
            tone="supply"
            onTrend={() => showTrend("supply_temp_c")}
          />
          <DiagramBadge
            label="Poisto T3"
            value={formatTemp(s.exhaust_temp_c)}
            left="78%"
            top="46%"
            tone="extract"
            onTrend={() => showTrend("exhaust_temp_c")}
          />

          <button
            type="button"
            onClick={() => showTrend("lto_temp_efficiency_pct")}
            className="absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-xl border border-emerald-300 bg-emerald-50/95 px-2 py-1.5 text-center shadow-md backdrop-blur transition hover:ring-2 hover:ring-emerald-400 sm:px-3 sm:py-2"
            style={{ left: "50%", top: "21%" }}
            title="Näytä LTO-trendi"
          >
            <p className="text-[9px] font-semibold uppercase tracking-wide text-emerald-800 sm:text-[10px]">
              LTO höytys
            </p>
            <p className="text-sm font-bold text-emerald-950 sm:text-lg">
              {s.lto_temp_efficiency_pct != null
                ? `${s.lto_temp_efficiency_pct.toFixed(0)} %`
                : "—"}
            </p>
            {s.lto_energy_efficiency_pct != null &&
              s.lto_energy_efficiency_pct !== s.lto_temp_efficiency_pct && (
                <p className="text-[9px] text-emerald-800 sm:text-[10px]">
                  Energia {s.lto_energy_efficiency_pct.toFixed(0)} %
                </p>
              )}
          </button>

          <FanSpeedBadge
            label="Tulo"
            requested={s.fan_supply_target}
            actual={s.fan_supply_pct}
            left="16%"
            top="74%"
            tone="supply"
            onTrend={() => showTrend("fan_supply_pct")}
          />
          <FanSpeedBadge
            label="Poisto"
            requested={s.fan_exhaust_target}
            actual={s.fan_exhaust_pct}
            left="84%"
            top="74%"
            tone="extract"
            onTrend={() => showTrend("fan_exhaust_pct")}
          />

          <div
            className="absolute bottom-[2%] left-1/2 z-10 w-[min(92%,340px)] -translate-x-1/2 rounded-xl border border-stone-200 bg-white/95 p-2 shadow-md backdrop-blur sm:p-3"
          >
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs sm:grid-cols-4 sm:text-sm">
              <Reading label="CO₂" value={s.co2_ppm != null ? `${Math.round(s.co2_ppm)} ppm` : "—"} onTrend={() => showTrend("co2_ppm")} />
              <Reading label="Kosteus" value={s.humidity_pct != null ? `${Math.round(s.humidity_pct)} %` : "—"} onTrend={() => showTrend("humidity_pct")} />
              <Reading label="PM2.5" value={s.pm25_ugm3 != null ? `${s.pm25_ugm3.toFixed(1)}` : "—"} onTrend={() => showTrend("pm25_ugm3")} />
              <Reading
                label="Huone"
                value={s.temperature_c != null ? `${s.temperature_c.toFixed(1)} °C` : "—"}
                onTrend={() => showTrend("temperature_c")}
              />
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5 border-t border-stone-100 pt-2">
              <StatusDot ok={hubOnline} warn={!hubOnline} label={hubOnline ? "Hub online" : onlineLabel} onTrend={() => showTrend("hub_online")} />
              <StatusDot
                ok={airfiOnline}
                warn={!airfiOnline}
                label={
                  airfiOnline
                    ? status?.airfi.source === "hub"
                      ? "AirFi (hub)"
                      : "AirFi online"
                    : "AirFi offline"
                }
                onTrend={() => showTrend("airfi_online")}
              />
              <StatusDot label={MODE_LABELS[hub.control_mode]} ok={hub.control_mode === "auto"} onTrend={() => showTrend("control_mode")} />
              {co2Band && (
                <StatusDot
                  label={getCo2BandLabel(co2Band)}
                  warn={co2Band === "high" || co2Band === "max"}
                  ok={co2Band === "normal"}
                  onTrend={() => showTrend("co2_ppm")}
                />
              )}
              {s.fireplace_active && <StatusDot label="Takka" warn onTrend={() => showTrend("fireplace_active")} />}
              {s.hood_active && <StatusDot label="Liesi" warn onTrend={() => showTrend("hood_active")} />}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function FanSpeedBadge({
  label,
  requested,
  actual,
  left,
  top,
  tone,
  onTrend,
}: {
  label: string;
  requested: number | null | undefined;
  actual: number | null | undefined;
  left: string;
  top: string;
  tone: "supply" | "extract";
  onTrend: () => void;
}) {
  const styles = {
    supply: "border-blue-300 bg-blue-50/95 text-blue-950 hover:ring-blue-400",
    extract: "border-red-300 bg-red-50/95 text-red-950 hover:ring-red-400",
  }[tone];

  return (
    <button
      type="button"
      onClick={onTrend}
      title="Näytä trendi"
      className={`absolute z-10 min-w-[5.5rem] -translate-x-1/2 -translate-y-1/2 rounded-lg border px-2 py-1.5 text-left shadow-sm backdrop-blur transition hover:ring-2 sm:min-w-[6.5rem] sm:px-2.5 ${styles}`}
      style={{ left, top }}
    >
      <p className="text-[8px] font-semibold uppercase tracking-wide opacity-80 sm:text-[9px]">
        {label}
      </p>
      <FanSpeedRow kind="requested" value={requested} />
      <FanSpeedRow kind="actual" value={actual} />
    </button>
  );
}

function FanSpeedRow({
  kind,
  value,
}: {
  kind: "requested" | "actual";
  value: number | null | undefined;
}) {
  const label = kind === "requested" ? "Pyydetty" : "Toteutunut";
  const pct = value != null && Number.isFinite(value) ? Math.round(value) : null;

  return (
    <div className="flex items-baseline justify-between gap-2 leading-tight">
      <span className="text-[8px] opacity-75 sm:text-[9px]">{label}</span>
      <span
        className={`text-xs font-bold tabular-nums sm:text-sm ${
          kind === "actual" ? "text-inherit" : "opacity-90"
        }`}
      >
        {pct != null ? `${pct} %` : "—"}
      </span>
    </div>
  );
}

function DiagramBadge({
  label,
  value,
  sub,
  left,
  top,
  tone,
  compact,
  onTrend,
}: {
  label: string;
  value: string;
  sub?: string;
  left: string;
  top: string;
  tone: "cold" | "warm" | "supply" | "extract";
  compact?: boolean;
  onTrend: () => void;
}) {
  const styles = {
    cold: "border-sky-300 bg-sky-50/95 text-sky-950 hover:ring-sky-400",
    warm: "border-orange-300 bg-orange-50/95 text-orange-950 hover:ring-orange-400",
    supply: "border-blue-300 bg-blue-50/95 text-blue-950 hover:ring-blue-400",
    extract: "border-red-300 bg-red-50/95 text-red-950 hover:ring-red-400",
  }[tone];

  return (
    <button
      type="button"
      onClick={onTrend}
      title="Näytä trendi"
      className={`absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-lg border shadow-sm backdrop-blur transition hover:ring-2 ${styles} ${
        compact ? "px-1.5 py-1 sm:px-2" : "px-2 py-1.5 sm:px-2.5 sm:py-2"
      }`}
      style={{ left, top }}
    >
      <p className="text-[8px] font-semibold uppercase tracking-wide opacity-80 sm:text-[9px]">
        {label}
      </p>
      <p className={`font-bold leading-tight ${compact ? "text-xs sm:text-sm" : "text-sm sm:text-base"}`}>
        {value}
      </p>
      {sub && <p className="text-[8px] opacity-70 sm:text-[9px]">{sub}</p>}
    </button>
  );
}

function Reading({
  label,
  value,
  onTrend,
}: {
  label: string;
  value: string;
  onTrend: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onTrend}
      className="rounded-lg text-center transition hover:bg-stone-100"
      title="Näytä trendi"
    >
      <p className="text-[10px] font-medium uppercase tracking-wide text-stone-500">{label}</p>
      <p className="font-semibold text-stone-900">{value}</p>
    </button>
  );
}

function StatusDot({
  label,
  ok,
  warn,
  onTrend,
}: {
  label: string;
  ok?: boolean;
  warn?: boolean;
  onTrend: () => void;
}) {
  const cls = warn
    ? "bg-amber-100 text-amber-900 hover:ring-amber-300"
    : ok
      ? "bg-emerald-100 text-emerald-800 hover:ring-emerald-300"
      : "bg-stone-100 text-stone-600 hover:ring-stone-300";
  return (
    <button
      type="button"
      onClick={onTrend}
      title="Näytä trendi"
      className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition hover:ring-2 sm:text-xs ${cls}`}
    >
      {label}
    </button>
  );
}

function formatTemp(c: number | null | undefined): string {
  return c != null ? `${c.toFixed(1)} °C` : "—";
}

function GearIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="size-4"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M8.34 1.804A1 1 0 0 1 9.32 1h1.36a1 1 0 0 1 .98.804l.295 1.473c.497.144.97.332 1.413.562l1.285-1.027a1 1 0 0 1 1.437.17l.963.964a1 1 0 0 1 .17 1.437l-1.027 1.285c.23.443.418.916.562 1.413l1.473.294a1 1 0 0 1 .804.983v1.361a1 1 0 0 1-.804.983l-1.473.294a6.037 6.037 0 0 1-.562 1.413l1.027 1.285a1 1 0 0 1-.17 1.437l-.964.963a1 1 0 0 1-1.437.17l-1.285-1.027a6.052 6.052 0 0 1-1.413.562l-.294 1.473a1 1 0 0 1-.983.804H9.32a1 1 0 0 1-.98-.804l-.294-1.473a6.037 6.037 0 0 1-1.413-.562l-1.285 1.027a1 1 0 0 1-1.437-.17l-.964-.963a1 1 0 0 1-.17-1.437l1.027-1.285a6.052 6.052 0 0 1-.562-1.413l-1.473-.294A1 1 0 0 1 1 10.68V9.32a1 1 0 0 1 .804-.983l1.473-.294c.144-.497.332-.97.562-1.413L2.812 5.245a1 1 0 0 1 .17-1.437l.963-.964a1 1 0 0 1 1.437-.17l1.285 1.027c.443-.23.916-.418 1.413-.562l.294-1.473ZM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
        clipRule="evenodd"
      />
    </svg>
  );
}
