"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { canWrite, hasCapability } from "@/lib/capabilities";
import { pressTypesForTrigger } from "@/lib/automation-actions";
import { PRESS_LABELS } from "@/lib/automation";
import {
  listTriggerActionsForDevice,
  labelTriggerAction,
} from "@/lib/automation-trigger-catalog";
import { triggerHintToAutomationFields, type DeviceLiveEvent } from "@/lib/device-events";
import { READING_ITEM_KEYS } from "@/lib/device-item-overrides";
import { protocolLabel } from "@/lib/device-protocol";
import { kindLabel, type HubLightDevice } from "@/lib/hub-lights";
import { LAITTEET } from "@/lib/laitteet-paths";
import type { ZwaveConfigParam, ZwaveNodeDetail, ZwaveNodeEndpoint, ZwaveProperty } from "@/lib/types";
import { configParamOptions, formatZwaveValue, toggleZwaveValue } from "@/lib/zwave-detail";
import { ItemRenameField } from "@/components/item-rename-field";
import { DeviceReadingRow } from "@/components/device-reading-row";
import { useHubCommandStatus } from "@/components/command-status-provider";
import { useMetricTrend } from "@/hooks/use-metric-trend";
import { deviceMetricKey } from "@/lib/device-metrics";

type Props = {
  protocol: "zigbee" | "zwave";
  deviceIdParam: string;
};

const HUE_PRESETS = [
  { label: "Punainen", hue: 0 },
  { label: "Oranssi", hue: 28 },
  { label: "Keltainen", hue: 46 },
  { label: "Vihreä", hue: 85 },
  { label: "Syaani", hue: 128 },
  { label: "Sininen", hue: 170 },
  { label: "Violetti", hue: 213 },
];

type DeviceResponse = {
  device: HubLightDevice;
  itemNames?: Record<string, string>;
  zwaveNode?: ZwaveNodeDetail | null;
  zwaveSiblings?: HubLightDevice[];
  recentEvents?: DeviceLiveEvent[];
};

export function DeviceDetailPanel({ protocol, deviceIdParam }: Props) {
  const [device, setDevice] = useState<HubLightDevice | null>(null);
  const [itemNames, setItemNames] = useState<Record<string, string>>({});
  const [zwaveNode, setZwaveNode] = useState<ZwaveNodeDetail | null>(null);
  const [zwaveSiblings, setZwaveSiblings] = useState<HubLightDevice[]>([]);
  const [events, setEvents] = useState<DeviceLiveEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [brightness, setBrightness] = useState(50);
  const { trackCommandIds } = useHubCommandStatus();
  const { showTrend, modal } = useMetricTrend();

  const listHref = protocol === "zigbee" ? LAITTEET.zigbee : LAITTEET.zwave;
  const encodedParam = encodeURIComponent(deviceIdParam);

  const loadDevice = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/devices/${encodedParam}?protocol=${protocol}`,
        { cache: "no-store" },
      );
      if (!res.ok) {
        setError("Laitetta ei löydy.");
        return;
      }
      const json = (await res.json()) as DeviceResponse;
      setDevice(json.device);
      setItemNames(json.itemNames ?? {});
      setZwaveNode(json.zwaveNode ?? null);
      setZwaveSiblings(json.zwaveSiblings ?? []);
      if (json.recentEvents?.length) {
        setEvents((prev) => {
          const merged = [...json.recentEvents!, ...prev];
          const seen = new Set<string>();
          return merged
            .filter((e) => {
              const key = `${e.at}:${e.label}`;
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            })
            .slice(0, 80);
        });
      }
      if (json.device.brightness != null) {
        setBrightness(Math.round((json.device.brightness / 254) * 100));
      }
      setError(null);
    } catch {
      setError("Laitteen lataus epäonnistui.");
    }
  }, [encodedParam, protocol]);

  useEffect(() => {
    void loadDevice();
    const id = setInterval(() => void loadDevice(), 5_000);
    return () => clearInterval(id);
  }, [loadDevice]);

  useEffect(() => {
    const source = new EventSource(
      `/api/devices/${encodedParam}/events?protocol=${protocol}`,
    );

    source.addEventListener("event", (msg) => {
      try {
        const evt = JSON.parse((msg as MessageEvent).data) as DeviceLiveEvent;
        setEvents((prev) => [evt, ...prev].slice(0, 80));
        if (evt.raw.state === "ON" || evt.raw.state === "OFF") {
          void loadDevice();
        }
      } catch {
        /* ignore */
      }
    });

    source.addEventListener("error", () => {
      /* Yellow-synkki tuo tapahtumat ilman suoraa MQTT:ää */
    });

    return () => source.close();
  }, [encodedParam, protocol, loadDevice]);

  const caps = device?.capabilities ?? [];
  const canSwitch = canWrite(caps, "switch") || canWrite(caps, "relay");
  const canDimmer = canWrite(caps, "dimmer");
  const canColor = canWrite(caps, "color");
  const canLock = canWrite(caps, "lock");
  const isButton = hasCapability(caps, "button");
  const isSensorWithButton =
    isButton &&
    (hasCapability(caps, "temperature") ||
      hasCapability(caps, "humidity") ||
      device?.kind === "sensor");

  const zwaveEndpoints = useMemo(() => {
    if (!zwaveNode?.endpoints?.length) return [];
    return [...zwaveNode.endpoints].sort((a, b) => a.endpoint - b.endpoint);
  }, [zwaveNode]);

  const showMultiZwaveControls = protocol === "zwave" && zwaveEndpoints.length > 1;

  const hasWritableControl =
    !showMultiZwaveControls &&
    (device?.controllable ?? false) &&
    !isSensorWithButton &&
    (canSwitch || canDimmer || canColor || canLock);

  const pressTypes = useMemo(() => pressTypesForTrigger(caps), [caps]);

  const triggerActionPreview = useMemo(() => {
    if (!device) return [];
    const observed = events
      .map((e) => e.triggerHint?.action)
      .filter((a): a is string => typeof a === "string" && a.length > 0);
    return listTriggerActionsForDevice(device, observed).slice(0, 24);
  }, [device, events]);

  function controlDevice(
    targetId: string,
    body: Record<string, unknown>,
    mqttSetTopic?: string | null,
    lockSetTopic?: string | null,
  ) {
    if (typeof body.on === "boolean") {
      setDevice((prev) => (prev ? { ...prev, on: body.on as boolean } : prev));
    }
    startTransition(async () => {
      try {
        const payload: Record<string, unknown> = { id: targetId, ...body };
        if (mqttSetTopic) payload.mqtt_set_topic = mqttSetTopic;
        if (lockSetTopic) payload.lock_set_topic = lockSetTopic;
        const res = await fetch("/api/lights/control", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = (await res.json()) as {
          ok?: boolean;
          error?: string;
          commandId?: string;
        };
        if (!json.ok) {
          setFlash(json.error ?? "Ohjaus epäonnistui");
          void loadDevice();
        } else {
          setFlash(null);
          if (json.commandId) trackCommandIds([json.commandId]);
        }
      } catch {
        setFlash("Ohjaus epäonnistui");
        void loadDevice();
      }
    });
  }

  function control(body: Record<string, unknown>) {
    if (!device) return;
    const sibling = zwaveSiblings.find((s) => s.id === device.id);
    controlDevice(device.id, body, sibling?.mqttSetTopic ?? device.mqttSetTopic, device.lockSetTopic);
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
        if (!json.ok) setFlash(json.error ?? "Asetus epäonnistui");
        else {
          setFlash(null);
          await loadDevice();
        }
      } catch {
        setFlash("Asetus epäonnistui");
      }
    });
  }

  if (error && !device) {
    return (
      <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
        {error}
        <div className="mt-3">
          <Link href={listHref} className="text-sm font-medium underline">
            ← Takaisin listaan
          </Link>
        </div>
      </div>
    );
  }

  if (!device) {
    return <p className="mt-6 text-sm text-stone-500">Ladataan laitetta…</p>;
  }

  const nodeProperties = zwaveNode?.properties ?? [];
  const nodeConfig = zwaveNode?.config ?? [];
  const displayName =
    zwaveNode && zwaveEndpoints.length > 1 ? zwaveNode.name : device.name;

  return (
    <div className="mt-6 space-y-6">
      {modal}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href={listHref} className="text-xs font-medium text-stone-500 hover:text-stone-800">
            ← {protocolLabel(protocol)}-laitteet
          </Link>
          <h2 className="mt-1 text-xl font-semibold text-stone-900">{displayName}</h2>
          <p className="mt-0.5 text-sm text-stone-500">
            {protocolLabel(device.protocol)} · {device.capabilitiesLabel || kindLabel(device.kind)}
            {device.room ? ` · ${device.room}` : ""}
            {zwaveEndpoints.length > 1 ? ` · ${zwaveEndpoints.length} kanavaa` : ""}
          </p>
          <p className="mt-1 font-mono text-[10px] text-stone-400">{device.id}</p>
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

      {isSensorWithButton && (
        <section className="rounded-2xl border border-sky-200 bg-sky-50/80 p-5">
          <h3 className="text-lg font-semibold text-sky-950">Anturi ja kaukosäädin</h3>
          <p className="mt-2 text-sm text-sky-900">
            Tämä ei ole valokytkin — sivulla ei ole Päälle/Pois-ohjausta. Lämpö ja kosteus mitataan
            automaattisesti ja ohjaavat ilmanvaihtoa (korkein kosteus voittaa). Painikkeet (+ / ○ / −)
            toimivat automaatioiden laukaisimina: paina nappia ja käytä alla olevaa tapahtumaa.
          </p>
        </section>
      )}

      {showMultiZwaveControls && (
        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-stone-900">Kanavat</h3>
          <p className="mt-1 text-sm text-stone-600">
            Löydetyt endpointit MQTT-skannauksesta — jokainen kanava ohjataan erikseen.
          </p>
          <div className="mt-4 space-y-4">
            {zwaveEndpoints.map((ep) => (
              <ZwaveEndpointControl
                key={ep.endpoint}
                endpoint={ep}
                sibling={zwaveSiblings.find((s) => s.id === ep.device_id)}
                pending={pending}
                onControl={(id, body, mqttTopic) => controlDevice(id, body, mqttTopic)}
              />
            ))}
          </div>
        </section>
      )}

      {hasWritableControl && (
        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-stone-900">Ohjaus</h3>
          <div className="mt-4 flex flex-wrap gap-2">
            {canSwitch && (
              <>
                <ControlButton disabled={pending} onClick={() => control({ on: true })}>
                  Päälle
                </ControlButton>
                <ControlButton disabled={pending} onClick={() => control({ on: false })}>
                  Pois
                </ControlButton>
              </>
            )}
            {canLock && (
              <>
                <ControlButton disabled={pending} onClick={() => control({ on: true })}>
                  Lukitse
                </ControlButton>
                <ControlButton disabled={pending} onClick={() => control({ on: false })}>
                  Avaa
                </ControlButton>
              </>
            )}
          </div>

          {canDimmer && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-stone-700">
                Kirkkaus {brightness} %
              </label>
              <input
                type="range"
                min={1}
                max={100}
                value={brightness}
                onChange={(e) => setBrightness(Number.parseInt(e.target.value, 10))}
                onMouseUp={() =>
                  control({
                    on: true,
                    brightness: Math.round((brightness / 100) * 254),
                  })
                }
                onTouchEnd={() =>
                  control({
                    on: true,
                    brightness: Math.round((brightness / 100) * 254),
                  })
                }
                className="mt-2 w-full"
              />
            </div>
          )}

          {canColor && (
            <div className="mt-4">
              <p className="text-sm font-medium text-stone-700">Väri</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {HUE_PRESETS.map((preset) => (
                  <button
                    key={preset.hue}
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      control({
                        on: true,
                        color: { hue: preset.hue, saturation: 254 },
                      })
                    }
                    className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium hover:bg-stone-50 disabled:opacity-50"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {protocol === "zwave" && nodeProperties.length > 0 && (
        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-stone-900">Ominaisuudet</h3>
          <ul className="mt-4 divide-y divide-stone-100">
            {nodeProperties.map((prop) => (
              <ZwavePropertyRow
                key={`${prop.cc}-${prop.endpoint}-${prop.property ?? ""}`}
                prop={prop}
                pending={pending}
                onSet={setZwaveProperty}
              />
            ))}
          </ul>
        </section>
      )}

      {protocol === "zwave" && nodeConfig.length > 0 && (
        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-stone-900">Konfiguraatio (CC 112)</h3>
          <ul className="mt-4 space-y-3">
            {nodeConfig.map((cfg) => (
              <ZwaveConfigRow
                key={cfg.param}
                cfg={cfg}
                pending={pending}
                onSet={setZwaveProperty}
              />
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-stone-900">Live-tapahtumat</h3>
          <span className="text-xs text-stone-500">Yellow · ~30 s</span>
        </div>
        <p className="mt-1 text-sm text-stone-600">
          Paina nappia — Yellow kuuntelee MQTT:ää paikallisesti ja synkkaa tapahtumat tänne. Käytä
          alla olevia arvoja automaation laukaisimena.
        </p>

        {(isButton || isSensorWithButton || device.kind === "switch" || protocol === "zwave") && (
          <div className="mt-4 rounded-xl border border-stone-100 bg-stone-50 p-3 text-xs text-stone-600">
            <p className="font-semibold text-stone-800">Laukaisuactionit automaatiossa</p>
            <p className="mt-1 flex flex-wrap gap-1">
              {triggerActionPreview.map((a) => (
                <code key={a.id} className="rounded bg-white px-1 py-0.5 text-[10px]" title={a.label}>
                  {a.id}
                </code>
              ))}
            </p>
            {triggerActionPreview.length >= 24 && (
              <p className="mt-1 text-stone-500">… ja lisää automaation valikossa</p>
            )}
            {isButton && (
              <p className="mt-2">
                Painallustyypit: {pressTypes.map((p) => PRESS_LABELS[p]).join(", ")}
              </p>
            )}
          </div>
        )}

        {events.length === 0 ? (
          <p className="mt-4 text-sm text-stone-500">
            Ei tapahtumia vielä — paina laitteen nappia ja odota synkkiä (~30 s).
          </p>
        ) : (
          <ul className="mt-4 max-h-96 space-y-2 overflow-y-auto">
            {events.map((evt, i) => {
              const hint = evt.triggerHint
                ? triggerHintToAutomationFields(evt.triggerHint)
                : null;
              const automationQuery = hint
                ? `${LAITTEET.automaatio}?trigger_device=${encodeURIComponent(device.id)}&trigger_press=${hint.press}&trigger_button=${encodeURIComponent(hint.button ?? "")}&trigger_action=${encodeURIComponent(hint.action ?? "")}`
                : null;

              return (
                <li
                  key={`${evt.at}-${i}`}
                  className="rounded-xl border border-stone-100 bg-stone-50 px-3 py-2 text-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-stone-900">{evt.label}</p>
                      <p className="mt-0.5 font-mono text-[10px] text-stone-500">
                        {new Date(evt.at).toLocaleTimeString("fi-FI")}
                        {evt.triggerHint?.action
                          ? ` · action: ${evt.triggerHint.action}`
                          : ""}
                        {evt.triggerHint?.button ? ` · ${evt.triggerHint.button}` : ""}
                      </p>
                    </div>
                    {automationQuery && (
                      <Link
                        href={automationQuery}
                        className="shrink-0 text-xs font-medium text-sky-700 hover:underline"
                      >
                        Käytä automaatiossa
                      </Link>
                    )}
                  </div>
                  {evt.triggerHint?.action && (
                    <p className="mt-1 text-[10px] text-stone-500">
                      Automaatio: painallus{" "}
                      {hint?.press ? PRESS_LABELS[hint.press] : "—"}
                      {hint?.button ? `, painike ${hint.button}` : ""}, MQTT{" "}
                      <code>{evt.triggerHint.action}</code> (
                      {labelTriggerAction(evt.triggerHint.action)})
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {(device.readingLabel ||
        device.temperature_c != null ||
        device.humidity_pct != null ||
        device.power_w != null ||
        (device as { battery_pct?: number }).battery_pct != null) && (
        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-stone-900">Tila ja mittaukset</h3>
          <p className="mt-1 text-xs text-stone-500">Nimeä jokainen lukema — nimet näkyvät listanäkymässä.</p>
          <ul className="mt-3 space-y-2 text-sm text-stone-700">
            {device.temperature_c != null && (
              <DeviceReadingRow
                deviceId={device.id}
                itemKey={READING_ITEM_KEYS.temperature}
                label={itemNames[READING_ITEM_KEYS.temperature] || "Lämpötila"}
                value={`${device.temperature_c.toFixed(1)} °C`}
                onRenamed={() => void loadDevice()}
                onShowTrend={() => showTrend(deviceMetricKey(device.id, "temperature_c"))}
              />
            )}
            {device.humidity_pct != null && (
              <DeviceReadingRow
                deviceId={device.id}
                itemKey={READING_ITEM_KEYS.humidity}
                label={itemNames[READING_ITEM_KEYS.humidity] || "Kosteus"}
                value={`${Math.round(device.humidity_pct)} %`}
                onRenamed={() => void loadDevice()}
                onShowTrend={() => showTrend(deviceMetricKey(device.id, "humidity_pct"))}
              />
            )}
            {typeof (device as { battery_pct?: number }).battery_pct === "number" && (
              <DeviceReadingRow
                deviceId={device.id}
                itemKey={READING_ITEM_KEYS.battery}
                label={itemNames[READING_ITEM_KEYS.battery] || "Akku"}
                value={`${Math.round((device as { battery_pct?: number }).battery_pct!)} %`}
                onRenamed={() => void loadDevice()}
                onShowTrend={() => showTrend(deviceMetricKey(device.id, "battery_pct"))}
              />
            )}
            {device.co2_ppm != null && (
              <DeviceReadingRow
                deviceId={device.id}
                itemKey={READING_ITEM_KEYS.co2}
                label={itemNames[READING_ITEM_KEYS.co2] || "CO₂"}
                value={`${Math.round(device.co2_ppm)} ppm`}
                onRenamed={() => void loadDevice()}
                onShowTrend={() => showTrend(deviceMetricKey(device.id, "co2_ppm"))}
              />
            )}
            {device.illuminance_lux != null && (
              <DeviceReadingRow
                deviceId={device.id}
                itemKey={READING_ITEM_KEYS.illuminance}
                label={itemNames[READING_ITEM_KEYS.illuminance] || "Valoisuus"}
                value={`${Math.round(device.illuminance_lux)} lx`}
                onRenamed={() => void loadDevice()}
                onShowTrend={() => showTrend(deviceMetricKey(device.id, "illuminance_lux"))}
              />
            )}
            {device.power_w != null && (
              <DeviceReadingRow
                deviceId={device.id}
                itemKey={READING_ITEM_KEYS.power}
                label={itemNames[READING_ITEM_KEYS.power] || "Teho"}
                value={`${Math.round(device.power_w)} W`}
                onRenamed={() => void loadDevice()}
                onShowTrend={() => showTrend(deviceMetricKey(device.id, "power_w"))}
              />
            )}
            {device.readingLabel &&
              device.temperature_c == null &&
              device.humidity_pct == null &&
              (device as { battery_pct?: number }).battery_pct == null && (
                <li className="text-stone-700">{device.readingLabel}</li>
              )}
          </ul>
        </section>
      )}
    </div>
  );
}

function ZwaveEndpointControl({
  endpoint,
  sibling,
  pending,
  onControl,
}: {
  endpoint: ZwaveNodeEndpoint;
  sibling?: HubLightDevice;
  pending: boolean;
  onControl: (id: string, body: Record<string, unknown>, mqttTopic?: string | null) => void;
}) {
  const caps = endpoint.capabilities ?? sibling?.capabilities ?? [];
  const canSwitch = canWrite(caps, "switch") || canWrite(caps, "relay");
  const canLock = canWrite(caps, "lock");
  const controllable =
    endpoint.controllable === true || sibling?.controllable === true;
  const deviceId = endpoint.device_id;
  const mqttTopic = endpoint.mqtt_set_topic ?? sibling?.mqttSetTopic;
  const on = endpoint.on ?? sibling?.on ?? false;

  if (!controllable || (!canSwitch && !canLock)) {
    return (
      <div className="rounded-xl border border-stone-100 bg-stone-50 px-4 py-3">
        <p className="font-medium text-stone-900">{endpoint.label}</p>
        <p className="mt-1 text-sm text-stone-600">
          {endpoint.properties?.length
            ? endpoint.properties.map((p) => `${p.label}: ${formatZwaveValue(p.value)}`).join(" · ")
            : "Ei ohjausta — vain lukuarvoja"}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-stone-200 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium text-stone-900">{endpoint.label}</p>
          <p className="text-xs text-stone-500">
            {on ? "Päällä" : "Pois"}
            {deviceId ? ` · ${deviceId}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canSwitch && (
            <>
              <ControlButton
                disabled={pending}
                onClick={() => onControl(deviceId, { on: true }, mqttTopic)}
              >
                Päälle
              </ControlButton>
              <ControlButton
                disabled={pending}
                onClick={() => onControl(deviceId, { on: false }, mqttTopic)}
              >
                Pois
              </ControlButton>
            </>
          )}
          {canLock && (
            <>
              <ControlButton
                disabled={pending}
                onClick={() => onControl(deviceId, { on: true }, mqttTopic)}
              >
                Lukitse
              </ControlButton>
              <ControlButton
                disabled={pending}
                onClick={() => onControl(deviceId, { on: false }, mqttTopic)}
              >
                Avaa
              </ControlButton>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ZwavePropertyRow({
  prop,
  pending,
  onSet,
}: {
  prop: ZwaveProperty;
  pending: boolean;
  onSet: (topic: string, value: unknown) => void;
}) {
  const epLabel = prop.endpoint > 0 ? ` · EP ${prop.endpoint}` : "";
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-2 text-sm">
      <div>
        <p className="font-medium text-stone-900">
          {prop.label}
          {epLabel}
        </p>
        <p className="text-xs text-stone-500">CC {prop.cc}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className="tabular-nums text-stone-700">{formatZwaveValue(prop.value)}</span>
        {prop.writable && prop.mqtt_topic && (
          <button
            type="button"
            disabled={pending}
            onClick={() => onSet(prop.mqtt_topic, toggleZwaveValue(prop.value))}
            className="rounded-lg border border-stone-200 px-2 py-1 text-xs hover:bg-stone-50 disabled:opacity-50"
          >
            Vaihda
          </button>
        )}
      </div>
    </li>
  );
}

function ZwaveConfigRow({
  cfg,
  pending,
  onSet,
}: {
  cfg: ZwaveConfigParam;
  pending: boolean;
  onSet: (topic: string, value: unknown) => void;
}) {
  const options = configParamOptions(cfg.param);

  return (
    <li className="rounded-xl border border-stone-100 bg-stone-50 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium text-stone-900">{cfg.label}</p>
          <p className="text-xs text-stone-500">Param {cfg.param}</p>
        </div>
        <span className="tabular-nums text-sm text-stone-700">{formatZwaveValue(cfg.value)}</span>
      </div>
      {options && cfg.mqtt_topic && (
        <div className="mt-2 flex flex-wrap gap-2">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              disabled={pending}
              onClick={() => onSet(cfg.mqtt_topic, opt.value)}
              className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs hover:bg-stone-100 disabled:opacity-50"
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </li>
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
