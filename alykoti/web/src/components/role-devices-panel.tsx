"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { deviceRoleLabel } from "@/lib/device-roles";
import type { DeviceRole } from "@/lib/device-roles";
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
  locked?: boolean | null;
  role?: DeviceRole;
};

type SectionSpec = {
  title: string;
  roles: DeviceRole[];
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
        const filtered = devices.filter((d) => d.role && roleSet(section.roles).has(d.role));
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
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {devices.map((device) => {
            const on = effectiveOn(device);
            const busy = busyId === device.id;
            const protocol = inferProtocolFromId(device.id, device.protocol as DeviceProtocol);
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
                    {device.capabilitiesLabel ? ` · ${device.capabilitiesLabel}` : ` · ${kindLabel(device.kind as "light")}`}
                    {device.readingLabel ? ` · ${device.readingLabel}` : ""}
                  </p>
                </div>
                {sensorMode || !device.controllable ? (
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
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${
                          on ? "bg-amber-400 text-amber-950 ring-2 ring-amber-500/40" : "bg-stone-900 text-white"
                        }`}
                      >
                        Päälle
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => onToggle(device, false)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${
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
