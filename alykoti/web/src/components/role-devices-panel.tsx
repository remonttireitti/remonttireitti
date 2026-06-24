"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  deviceRoleLabel,
  secondaryUsesLabel,
  type DeviceRole,
  type DeviceSecondaryUse,
} from "@/lib/device-roles";
import type { DeviceReading } from "@/lib/capabilities";
import { inferProtocolFromId, protocolLabel, type DeviceProtocol } from "@/lib/device-protocol";
import { kindLabel } from "@/lib/hub-lights";

type Device = {
  id: string;
  name: string;
  on: boolean;
  brightness?: number | null;
  reachable?: boolean;
  roomAnchorId?: string | null;
  protocol: DeviceProtocol | string;
  kind: string;
  room: string | null;
  controllable: boolean;
  capabilitiesLabel?: string;
  readingLabel?: string | null;
  readings?: DeviceReading[];
  locked?: boolean | null;
  role?: DeviceRole;
  roles?: DeviceRole[];
  secondaryUses?: DeviceSecondaryUse[];
};

type SectionSpec = {
  title: string;
  roles?: DeviceRole[];
  secondaryUse?: DeviceSecondaryUse;
  empty?: string;
  readOnlyHint?: string;
  sensorMode?: boolean;
};

type Props = {
  sections: SectionSpec[];
  pageTitle?: string;
  pageDescription?: string;
};

export function RoleDevicesPanel({ sections, pageTitle, pageDescription }: Props) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [configured, setConfigured] = useState(false);
  const [hubOnline, setHubOnline] = useState<boolean | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [optimisticOn, setOptimisticOn] = useState<Record<string, boolean>>({});
  const [flash, setFlash] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/home/devices", { cache: "no-store" });
      const json = (await res.json()) as {
        configured?: boolean;
        hubOnline?: boolean;
        devices?: Device[];
        error?: string;
      };
      setConfigured(json.configured === true);
      setHubOnline(json.hubOnline);
      setDevices(json.devices ?? []);
      setError(json.error ?? null);
    } catch {
      setError("Yhteys API:in epäonnistui");
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 8_000);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    setOptimisticOn((prev) => {
      if (Object.keys(prev).length === 0) return prev;
      const next = { ...prev };
      for (const d of devices) {
        if (next[d.id] !== undefined && next[d.id] === d.on) delete next[d.id];
      }
      return next;
    });
  }, [devices]);

  function effectiveOn(device: Device): boolean {
    return optimisticOn[device.id] ?? device.on;
  }

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

  const roleSet = (roles: DeviceRole[]) => new Set(roles);

  return (
    <div className="space-y-6">
      {(pageTitle || pageDescription) && (
        <div>
          {pageTitle && <h1 className="text-2xl font-bold tracking-tight text-stone-900">{pageTitle}</h1>}
          {pageDescription && <p className="mt-2 text-sm text-stone-600">{pageDescription}</p>}
        </div>
      )}

      {!configured && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950" role="alert">
          <p className="font-semibold">Laitteet eivät ole vielä synkassa</p>
          <p className="mt-1">Odota Yellow-synkkiä tai määritä laitetyypit Asetuksissa.</p>
        </div>
      )}

      {configured && hubOnline === false && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950" role="status">
          Yellow ei ole online — viimeisin tila näytetään.
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900" role="alert">
          {error}
        </div>
      )}

      {flash && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900" role="status">
          {flash}
        </div>
      )}

      {sections.map((section) => {
        const filtered = section.secondaryUse
          ? devices.filter((d) => d.secondaryUses?.includes(section.secondaryUse!))
          : devices.filter((d) => d.role && roleSet(section.roles ?? []).has(d.role));
        return (
          <DeviceSection
            key={section.title}
            title={section.title}
            empty={section.empty ?? "Ei laitteita — valitse laitetyyppi Asetuksissa."}
            devices={filtered}
            busyId={busyId}
            onToggle={toggle}
            effectiveOn={effectiveOn}
            readOnlyHint={section.readOnlyHint}
            sensorMode={section.sensorMode}
          />
        );
      })}
    </div>
  );
}

const ALERT_VALUES = new Set(["hälytys", "vuoto", "avoin", "liike", "peukaloitu", "päällä"]);

function readingTone(value: string): "ok" | "alert" | "neutral" {
  const v = value.toLowerCase();
  if (ALERT_VALUES.has(v)) return "alert";
  if (v === "ok" || v === "kuiva" || v === "kiinni" || v === "ei liikettä" || v === "tyhjä") return "ok";
  return "neutral";
}

function findReading(readings: DeviceReading[], ...labels: string[]): DeviceReading | undefined {
  const lower = labels.map((l) => l.toLowerCase());
  return readings.find((r) => lower.some((l) => r.label.toLowerCase().includes(l)));
}

function primarySensorBadge(device: Device): { label: string; tone: "ok" | "alert" | "neutral" } | null {
  const readings = device.readings ?? [];
  if (readings.length > 0) {
    switch (device.role) {
      case "fire_alarm": {
        const r = findReading(readings, "savu", "smoke", "co");
        if (r) return { label: r.value, tone: readingTone(r.value) };
        break;
      }
      case "leak_detector": {
        const r = findReading(readings, "vesivuoto", "vuoto", "water", "leak");
        if (r) return { label: r.value, tone: readingTone(r.value) };
        break;
      }
      case "motion": {
        const r = findReading(readings, "liike", "motion", "occupancy", "paikallaolo");
        if (r) return { label: r.value, tone: readingTone(r.value) };
        break;
      }
      case "contact": {
        const r = findReading(readings, "ovi", "ikkuna", "contact");
        if (r) return { label: r.value, tone: readingTone(r.value) };
        break;
      }
    }
    const alarm = readings.find((r) => readingTone(r.value) === "alert");
    if (alarm) return { label: alarm.value, tone: "alert" };
    const first = readings[0];
    if (first) return { label: first.value, tone: readingTone(first.value) };
  }
  if (device.readingLabel) {
    const firstPart = device.readingLabel.split(" · ")[0]?.trim();
    if (firstPart) {
      const value = firstPart.includes(":") ? firstPart.split(":").slice(1).join(":").trim() : firstPart;
      return { label: value, tone: readingTone(value) };
    }
  }
  if (device.on) return { label: "Hälytys", tone: "alert" };
  return { label: "OK", tone: "ok" };
}

function badgeClasses(tone: "ok" | "alert" | "neutral"): string {
  switch (tone) {
    case "alert":
      return "bg-red-100 text-red-900 ring-red-200";
    case "ok":
      return "bg-emerald-100 text-emerald-900 ring-emerald-200";
    default:
      return "bg-stone-100 text-stone-800 ring-stone-200";
  }
}

function secondaryUseHint(device: Device): string | null {
  return secondaryUsesLabel(device.secondaryUses ?? []);
}

function SensorDeviceCard({ device }: { device: Device }) {
  const protocol = inferProtocolFromId(device.id, device.protocol as DeviceProtocol);
  const readings = device.readings ?? [];
  const badge = primarySensorBadge(device);
  const alsoUsed = secondaryUseHint(device);

  return (
    <li className="col-span-full rounded-xl border border-stone-200 bg-stone-50 p-4 sm:col-span-1">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-stone-900">{device.name}</p>
          <p className="mt-0.5 text-xs text-stone-500">
            {protocolLabel(protocol)}
            {device.room ? ` · ${device.room}` : ""}
            {device.role ? ` · ${deviceRoleLabel(device.role)}` : ""}
            {alsoUsed ? ` · ${alsoUsed}` : ""}
          </p>
        </div>
        {badge && (
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${badgeClasses(badge.tone)}`}
          >
            {badge.label}
          </span>
        )}
      </div>

      {readings.length > 0 ? (
        <dl className="mt-3 grid grid-cols-2 gap-2">
          {readings.map((reading, idx) => (
            <div
              key={`${reading.label}-${idx}`}
              className="rounded-lg border border-stone-200 bg-white px-2.5 py-2"
            >
              <dt className="text-[10px] font-medium uppercase tracking-wide text-stone-500">
                {reading.label}
              </dt>
              <dd className="mt-0.5 text-sm font-semibold text-stone-900">{reading.value}</dd>
            </div>
          ))}
        </dl>
      ) : device.readingLabel ? (
        <p className="mt-3 text-sm text-stone-700">{device.readingLabel}</p>
      ) : (
        <p className="mt-3 text-sm text-stone-500">Ei lukemia</p>
      )}
    </li>
  );
}

function DeviceSection({
  title,
  empty,
  devices,
  busyId,
  onToggle,
  effectiveOn,
  readOnlyHint,
  sensorMode,
}: {
  title: string;
  empty: string;
  devices: Device[];
  busyId: string | null;
  onToggle: (device: Device, on: boolean) => void;
  effectiveOn: (device: Device) => boolean;
  readOnlyHint?: string;
  sensorMode?: boolean;
}) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-stone-900">{title}</h2>

      {devices.length === 0 ? (
        <p className="mt-4 text-sm text-stone-600">{empty}</p>
      ) : sensorMode ? (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {devices.map((device) => (
            <SensorDeviceCard key={device.id} device={device} />
          ))}
        </ul>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {devices.map((device) => {
            const on = effectiveOn(device);
            const busy = busyId === device.id;
            const protocol = inferProtocolFromId(device.id, device.protocol as DeviceProtocol);
            const alsoUsed = secondaryUseHint(device);
            return (
              <li
                key={device.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-stone-900">{device.name}</p>
                  <p className="truncate text-xs text-stone-500">
                    {protocolLabel(protocol)}
                    {device.room ? ` · ${device.room}` : ""}
                    {device.role ? ` · ${deviceRoleLabel(device.role)}` : ""}
                    {alsoUsed ? ` · ${alsoUsed}` : ""}
                    {device.capabilitiesLabel ? ` · ${device.capabilitiesLabel}` : ` · ${kindLabel(device.kind as "light")}`}
                    {device.readingLabel ? ` · ${device.readingLabel}` : ""}
                  </p>
                </div>
                {!device.controllable ? (
                  <span className="shrink-0 text-xs text-stone-500">
                    {device.readingLabel || (on ? "Päällä" : "Pois")}
                    {readOnlyHint ? " · ei ohjaus" : ""}
                  </span>
                ) : (
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className={`text-xs font-semibold ${on ? "text-amber-700" : "text-stone-500"}`}>
                      {busy ? "Lähetetään…" : on ? "Päällä" : "Pois"}
                    </span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => onToggle(device, true)}
                        className={`rounded-lg px-4 py-2.5 text-xs font-semibold disabled:opacity-50 md:px-3 md:py-1.5 ${
                          on ? "bg-amber-400 text-amber-950 ring-2 ring-amber-500/40" : "bg-stone-900 text-white"
                        }`}
                      >
                        Päälle
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => onToggle(device, false)}
                        className={`rounded-lg border px-4 py-2.5 text-xs font-semibold disabled:opacity-50 md:px-3 md:py-1.5 ${
                          !on
                            ? "border-stone-400 bg-stone-200 text-stone-900 ring-2 ring-stone-400/50"
                            : "border-stone-300 text-stone-800"
                        }`}
                      >
                        Pois
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
