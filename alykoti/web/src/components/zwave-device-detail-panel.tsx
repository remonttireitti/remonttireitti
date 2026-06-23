"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { canWrite, hasCapability } from "@/lib/capabilities";
import { pressTypesForTrigger } from "@/lib/automation-actions";
import { listTriggerActionsForDevice } from "@/lib/automation-trigger-catalog";
import { triggerHintToAutomationFields, type DeviceLiveEvent } from "@/lib/device-events";
import {
  zwaveConfigItemKey,
  zwaveEndpointItemKey,
  zwavePropertyItemKey,
} from "@/lib/device-item-overrides";
import { kindLabel, type HubLightDevice } from "@/lib/hub-lights";
import { LAITTEET } from "@/lib/laitteet-paths";
import type { ZwaveConfigParam, ZwaveNodeDetail, ZwaveNodeEndpoint, ZwaveProperty } from "@/lib/types";
import { configParamOptions, endpointShowsBinaryState, formatEndpointBinaryState, formatZwaveValue, zwaveNodeId } from "@/lib/zwave-detail";
import { hubDeviceToZwaveEndpoint } from "@/lib/zwave-device-resolve";
import { ItemRenameField } from "@/components/item-rename-field";
import { useHubCommandStatus } from "@/components/command-status-provider";

type Props = {
  deviceIdParam: string;
};

type DeviceResponse = {
  device: HubLightDevice;
  zwaveNode?: ZwaveNodeDetail | null;
  zwaveSiblings?: HubLightDevice[];
  recentEvents?: DeviceLiveEvent[];
};

export function ZwaveDeviceDetailPanel({ deviceIdParam }: Props) {
  const [device, setDevice] = useState<HubLightDevice | null>(null);
  const [zwaveNode, setZwaveNode] = useState<ZwaveNodeDetail | null>(null);
  const [siblings, setSiblings] = useState<HubLightDevice[]>([]);
  const [events, setEvents] = useState<DeviceLiveEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [configDrafts, setConfigDrafts] = useState<Record<number, string>>({});
  const { trackCommandIds } = useHubCommandStatus();

  const encodedParam = encodeURIComponent(deviceIdParam);

  const loadDevice = useCallback(async () => {
    try {
      const res = await fetch(`/api/devices/${encodedParam}?protocol=zwave`, { cache: "no-store" });
      if (!res.ok) {
        setError("Laitetta ei löydy.");
        return;
      }
      const json = (await res.json()) as DeviceResponse;
      setDevice(json.device);
      setZwaveNode(json.zwaveNode ?? null);
      setSiblings(json.zwaveSiblings ?? []);
      if (json.recentEvents?.length) {
        setEvents((prev) => mergeEvents(json.recentEvents!, prev));
      }
      if (json.zwaveNode?.config) {
        setConfigDrafts((prev) => {
          const next = { ...prev };
          for (const c of json.zwaveNode!.config) {
            if (next[c.param] === undefined && c.value != null) {
              next[c.param] = String(c.value);
            }
          }
          return next;
        });
      }
      setError(null);
    } catch {
      setError("Laitteen lataus epäonnistui.");
    }
  }, [encodedParam]);

  useEffect(() => {
    void loadDevice();
    const id = setInterval(() => void loadDevice(), 5_000);
    return () => clearInterval(id);
  }, [loadDevice]);

  useEffect(() => {
    const source = new EventSource(`/api/devices/${encodedParam}/events?protocol=zwave`);
    source.addEventListener("event", (msg) => {
      try {
        const evt = JSON.parse((msg as MessageEvent).data) as DeviceLiveEvent;
        setEvents((prev) => [evt, ...prev].slice(0, 80));
        if (evt.raw.state === "ON" || evt.raw.state === "OFF") void loadDevice();
      } catch {
        /* ignore */
      }
    });
    return () => source.close();
  }, [encodedParam, loadDevice]);

  const endpoints = zwaveNode?.endpoints ?? [];
  const controllableEndpoints = useMemo(() => {
    const fromNode = endpoints.filter((ep) => ep.controllable);
    if (fromNode.length > 0) return fromNode;
    return siblings.filter((s) => s.controllable).map(hubDeviceToZwaveEndpoint);
  }, [endpoints, siblings]);
  const nodeReadings = useMemo(() => {
    if (!zwaveNode) return [];
    const seen = new Set<string>();
    const out: ZwaveProperty[] = [];
    for (const p of zwaveNode.properties) {
      const key = `${p.cc}:${p.endpoint}:${p.property ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (p.cc === 37 || p.cc === 38) continue;
      out.push(p);
    }
    return out;
  }, [zwaveNode]);

  const binaryEndpoints = useMemo(
    () => endpoints.filter((ep) => endpointShowsBinaryState(ep)),
    [endpoints],
  );

  const pressTypes = useMemo(() => pressTypesForTrigger(device?.capabilities ?? []), [device]);

  const triggerActionPreview = useMemo(() => {
    if (!device) return [];
    const observed = events
      .map((e) => e.triggerHint?.action)
      .filter((a): a is string => typeof a === "string" && a.length > 0);
    return listTriggerActionsForDevice(device, observed).slice(0, 24);
  }, [device, events]);

  function controlEndpoint(ep: ZwaveNodeEndpoint, on: boolean) {
    setDevice((prev) =>
      prev?.id === ep.device_id ? { ...prev, on } : prev,
    );
    startTransition(async () => {
      try {
        const res = await fetch("/api/lights/control", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: ep.device_id, on }),
        });
        const json = (await res.json()) as {
          ok?: boolean;
          error?: string;
          commandId?: string;
        };
        if (!json.ok) {
          setFlash(json.error ?? "Ohjaus epäonnistui");
          await loadDevice();
        } else {
          setFlash(null);
          if (json.commandId) trackCommandIds([json.commandId]);
        }
      } catch {
        setFlash("Ohjaus epäonnistui");
        await loadDevice();
      }
    });
  }

  function setZwaveProperty(mqttTopic: string, value: unknown) {
    startTransition(async () => {
      try {
        const res = await fetch("/api/devices/zwave/property", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mqtt_topic: mqttTopic, value }),
        });
        const json = (await res.json()) as { ok?: boolean; error?: string };
        if (!json.ok) setFlash(json.error ?? "Tallennus epäonnistui");
        else {
          setFlash(null);
          await loadDevice();
        }
      } catch {
        setFlash("Tallennus epäonnistui");
      }
    });
  }

  function saveConfig(param: ZwaveConfigParam) {
    const raw = configDrafts[param.param] ?? String(param.value ?? "");
    const options = configParamOptions(param.param);
    let value: boolean | number | string = raw;
    if (options) {
      value = Number.parseInt(raw, 10);
      if (!Number.isFinite(value)) {
        setFlash(`Virheellinen arvo param ${param.param}`);
        return;
      }
    } else if (/^-?\d+$/.test(raw.trim())) {
      value = Number.parseInt(raw.trim(), 10);
    } else if (raw === "true" || raw === "false") {
      value = raw === "true";
    }
    setZwaveProperty(param.mqtt_topic, value);
  }

  if (error && !device) {
    return (
      <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
        {error}
        <div className="mt-3">
          <Link href={LAITTEET.zwave} className="text-sm font-medium underline">
            ← Takaisin listaan
          </Link>
        </div>
      </div>
    );
  }

  if (!device) {
    return <p className="mt-6 text-sm text-stone-500">Ladataan laitetta…</p>;
  }

  const nodeName = zwaveNode?.name ?? device.name;
  const nodeRoom = zwaveNode?.room ?? device.room;
  const nodeId = zwaveNode?.node_id ?? device.node_id;
  const overrideDeviceId = nodeId != null ? zwaveNodeId(nodeId) : device.id;

  return (
    <div className="mt-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href={LAITTEET.zwave} className="text-xs font-medium text-stone-500 hover:text-stone-800">
            ← Z-Wave-laitteet
          </Link>
          <h2 className="mt-1 text-xl font-semibold text-stone-900">{nodeName}</h2>
          <p className="mt-0.5 text-sm text-stone-500">
            Z-Wave · solmu {nodeId} · {device.capabilitiesLabel || kindLabel(device.kind)}
            {nodeRoom ? ` · ${nodeRoom}` : ""}
          </p>
          <p className="mt-1 font-mono text-[10px] text-stone-400">{device.id}</p>
          {siblings.length > 1 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {siblings.map((s) => (
                <Link
                  key={s.id}
                  href={LAITTEET.zwaveDevice(s.id)}
                  className={`rounded-lg border px-2 py-1 text-xs font-medium ${
                    s.id === device.id
                      ? "border-stone-900 bg-stone-900 text-white"
                      : "border-stone-200 text-stone-700 hover:bg-stone-50"
                  }`}
                >
                  {s.name.includes("(") ? (s.name.split("(").pop()?.replace(")", "") ?? s.name) : s.name}
                </Link>
              ))}
            </div>
          )}
        </div>
        <Link
          href={`${LAITTEET.automaatio}?trigger_device=${encodeURIComponent(device.id)}`}
          className="rounded-xl border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50"
        >
          Luo automaatio
        </Link>
      </div>

      {flash && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900">{flash}</div>
      )}

      {controllableEndpoints.length > 0 && (
        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-stone-900">Ohjaus</h3>
          <p className="mt-1 text-xs text-stone-500">Nimeä jokainen kanava erikseen — nimet näkyvät listassa ja automaatioissa.</p>
          <div className="mt-4 space-y-4">
            {controllableEndpoints.map((ep) => (
                <EndpointControl
                  key={ep.device_id}
                  endpoint={ep}
                  overrideDeviceId={overrideDeviceId}
                  pending={pending}
                  onToggle={(on) => controlEndpoint(ep, on)}
                  onRenamed={() => void loadDevice()}
                />
              ))}
          </div>
        </section>
      )}

      {(nodeReadings.length > 0 ||
        device.temperature_c != null ||
        device.humidity_pct != null ||
        device.readingLabel ||
        binaryEndpoints.length > 0) && (
        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-stone-900">Tila</h3>
          {nodeReadings.length > 0 && (
            <ul className="mt-3 space-y-3 text-sm text-stone-700">
              {nodeReadings.map((p) => (
                <li key={`${p.cc}-${p.endpoint}-${p.property ?? ""}`} className="flex justify-between gap-4">
                  <ItemRenameField
                    deviceId={overrideDeviceId}
                    itemKey={zwavePropertyItemKey(p)}
                    currentName={p.label}
                    onRenamed={() => void loadDevice()}
                  />
                  <span className="shrink-0 font-medium">{formatZwaveValue(p.value)}</span>
                </li>
              ))}
            </ul>
          )}
          {device.readingLabel && nodeReadings.length === 0 && (
            <p className="mt-2 text-sm text-stone-700">{device.readingLabel}</p>
          )}
          {binaryEndpoints.length > 0 && (
            <ul
              className={`mt-3 space-y-1 text-sm ${
                nodeReadings.length > 0 ? "border-t border-stone-100 pt-3" : ""
              }`}
            >
              {binaryEndpoints.map((ep) => (
                <li key={ep.device_id} className="flex justify-between gap-4 text-stone-600">
                  <ItemRenameField
                    deviceId={overrideDeviceId}
                    itemKey={zwaveEndpointItemKey(ep.endpoint)}
                    currentName={ep.label}
                    onRenamed={() => void loadDevice()}
                  />
                  <span className={`shrink-0 ${ep.on ? "font-medium text-amber-700" : ""}`}>
                    {formatEndpointBinaryState(ep)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {zwaveNode && zwaveNode.config.length > 0 && (
        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-stone-900">Asetukset (Configuration)</h3>
          <p className="mt-1 text-xs text-stone-500">CC 112 — Z-Wave JS UI -parametrit</p>
          <ul className="mt-4 space-y-4">
            {zwaveNode.config.map((param) => {
              const options =
                param.states?.map((s) => ({ label: s.text, value: s.value })) ??
                configParamOptions(param.param);
              const draft = configDrafts[param.param] ?? String(param.value ?? "");
              return (
                <li key={param.param} className="rounded-xl border border-stone-100 bg-stone-50 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-stone-900">
                        [{nodeId}-112-0-{param.param}]{" "}
                        <ItemRenameField
                          deviceId={overrideDeviceId}
                          itemKey={zwaveConfigItemKey(param.param)}
                          currentName={param.label}
                          className="inline-flex"
                          onRenamed={() => void loadDevice()}
                        />
                      </p>
                      <p className="mt-0.5 font-mono text-[10px] text-stone-400">{param.mqtt_topic}</p>
                    </div>
                    <span className="text-xs text-stone-500">Nykyinen: {formatZwaveValue(param.value)}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-end gap-2">
                    {options ? (
                      <select
                        value={draft}
                        onChange={(e) =>
                          setConfigDrafts((prev) => ({ ...prev, [param.param]: e.target.value }))
                        }
                        className="rounded-lg border border-stone-200 px-3 py-2 text-sm"
                        disabled={pending}
                      >
                        {options.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label} ({o.value})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={draft}
                        onChange={(e) =>
                          setConfigDrafts((prev) => ({ ...prev, [param.param]: e.target.value }))
                        }
                        className="w-32 rounded-lg border border-stone-200 px-3 py-2 text-sm"
                        disabled={pending}
                      />
                    )}
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => saveConfig(param)}
                      className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-50"
                    >
                      Tallenna
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-stone-900">Live-tapahtumat</h3>
          <span className="text-xs text-stone-500">Yellow · ~30 s</span>
        </div>
        {triggerActionPreview.length > 0 && (
          <div className="mt-4 rounded-xl border border-stone-100 bg-stone-50 p-3 text-xs text-stone-600">
            <p className="font-semibold text-stone-800">Laukaisuactionit</p>
            <p className="mt-1 flex flex-wrap gap-1">
              {triggerActionPreview.map((a) => (
                <code key={a.id} className="rounded bg-white px-1 py-0.5 text-[10px]">
                  {a.id}
                </code>
              ))}
            </p>
          </div>
        )}
        {events.length === 0 ? (
          <p className="mt-4 text-sm text-stone-500">Ei tapahtumia vielä.</p>
        ) : (
          <ul className="mt-4 max-h-96 space-y-2 overflow-y-auto">
            {events.map((evt, i) => {
              const hint = evt.triggerHint ? triggerHintToAutomationFields(evt.triggerHint) : null;
              const automationQuery = hint
                ? `${LAITTEET.automaatio}?trigger_device=${encodeURIComponent(device.id)}&trigger_press=${hint.press}&trigger_button=${encodeURIComponent(hint.button ?? "")}&trigger_action=${encodeURIComponent(hint.action ?? "")}`
                : null;
              return (
                <li key={`${evt.at}-${i}`} className="rounded-xl border border-stone-100 bg-stone-50 px-3 py-2 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-stone-900">{evt.label}</p>
                      <p className="mt-0.5 font-mono text-[10px] text-stone-500">
                        {new Date(evt.at).toLocaleTimeString("fi-FI")}
                      </p>
                    </div>
                    {automationQuery && (
                      <Link href={automationQuery} className="shrink-0 text-xs font-medium text-sky-700 hover:underline">
                        Käytä automaatiossa
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function EndpointControl({
  endpoint,
  overrideDeviceId,
  pending,
  onToggle,
  onRenamed,
}: {
  endpoint: ZwaveNodeEndpoint;
  overrideDeviceId: string;
  pending: boolean;
  onToggle: (on: boolean) => void;
  onRenamed: () => void;
}) {
  const canDim = canWrite(endpoint.capabilities ?? [], "dimmer");

  return (
    <div className="rounded-xl border border-stone-100 bg-stone-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <ItemRenameField
            deviceId={overrideDeviceId}
            itemKey={zwaveEndpointItemKey(endpoint.endpoint)}
            currentName={endpoint.label}
            onRenamed={onRenamed}
          />
          <p className="text-xs text-stone-500">
            Endpoint {endpoint.endpoint}
            {endpoint.control_cc ? ` · CC ${endpoint.control_cc}` : ""} · {endpoint.on ? "Päällä" : "Pois"}
          </p>
        </div>
        <div className="flex gap-2">
          <ControlButton disabled={pending} onClick={() => onToggle(true)}>
            Päälle
          </ControlButton>
          <ControlButton disabled={pending} onClick={() => onToggle(false)}>
            Pois
          </ControlButton>
        </div>
      </div>
      {canDim && endpoint.brightness != null && (
        <p className="mt-2 text-xs text-stone-500">Kirkkaus {endpoint.brightness}</p>
      )}
    </div>
  );
}

function ControlButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function mergeEvents(incoming: DeviceLiveEvent[], prev: DeviceLiveEvent[]): DeviceLiveEvent[] {
  const merged = [...incoming, ...prev];
  const seen = new Set<string>();
  return merged
    .filter((e) => {
      const key = `${e.at}:${e.label}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 80);
}
