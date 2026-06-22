"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { hasCapability } from "@/lib/capabilities";
import { pressTypesForTrigger } from "@/lib/automation-actions";
import { PRESS_LABELS } from "@/lib/automation";
import {
  listTriggerActionsForDevice,
  labelTriggerAction,
} from "@/lib/automation-trigger-catalog";
import { triggerHintToAutomationFields, type DeviceLiveEvent } from "@/lib/device-events";
import { protocolLabel } from "@/lib/device-protocol";
import { kindLabel, type HubLightDevice } from "@/lib/hub-lights";
import { LAITTEET } from "@/lib/laitteet-paths";

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

export function DeviceDetailPanel({ protocol, deviceIdParam }: Props) {
  const [device, setDevice] = useState<HubLightDevice | null>(null);
  const [events, setEvents] = useState<DeviceLiveEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [brightness, setBrightness] = useState(50);

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
      const json = (await res.json()) as {
        device: HubLightDevice;
        recentEvents?: DeviceLiveEvent[];
      };
      setDevice(json.device);
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
  const hasSwitch = hasCapability(caps, "switch") || hasCapability(caps, "relay");
  const hasDimmer = hasCapability(caps, "dimmer");
  const hasColor = hasCapability(caps, "color");
  const hasLock = hasCapability(caps, "lock");
  const isButton = hasCapability(caps, "button");

  const pressTypes = useMemo(() => pressTypesForTrigger(caps), [caps]);

  const triggerActionPreview = useMemo(() => {
    if (!device) return [];
    const observed = events
      .map((e) => e.triggerHint?.action)
      .filter((a): a is string => typeof a === "string" && a.length > 0);
    return listTriggerActionsForDevice(device, observed).slice(0, 24);
  }, [device, events]);

  function control(body: Record<string, unknown>) {
    if (!device) return;
    startTransition(async () => {
      try {
        const res = await fetch("/api/lights/control", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: device.id, ...body }),
        });
        const json = (await res.json()) as { ok?: boolean; error?: string };
        if (!json.ok) setFlash(json.error ?? "Ohjaus epäonnistui");
        else {
          setFlash(null);
          await loadDevice();
        }
      } catch {
        setFlash("Ohjaus epäonnistui");
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

  return (
    <div className="mt-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href={listHref} className="text-xs font-medium text-stone-500 hover:text-stone-800">
            ← {protocolLabel(protocol)}-laitteet
          </Link>
          <h2 className="mt-1 text-xl font-semibold text-stone-900">{device.name}</h2>
          <p className="mt-0.5 text-sm text-stone-500">
            {protocolLabel(device.protocol)} · {device.capabilitiesLabel || kindLabel(device.kind)}
            {device.room ? ` · ${device.room}` : ""}
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

      {(hasSwitch || hasDimmer || hasColor || hasLock) && device.controllable && (
        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-stone-900">Ohjaus</h3>
          <div className="mt-4 flex flex-wrap gap-2">
            {hasSwitch && (
              <>
                <ControlButton disabled={pending} onClick={() => control({ on: true })}>
                  Päälle
                </ControlButton>
                <ControlButton disabled={pending} onClick={() => control({ on: false })}>
                  Pois
                </ControlButton>
              </>
            )}
            {hasLock && (
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

          {hasDimmer && (
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

          {hasColor && (
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

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-stone-900">Live-tapahtumat</h3>
          <span className="text-xs text-stone-500">Yellow · ~30 s</span>
        </div>
        <p className="mt-1 text-sm text-stone-600">
          Paina nappia — Yellow kuuntelee MQTT:ää paikallisesti ja synkkaa tapahtumat tänne. Käytä
          alla olevia arvoja automaation laukaisimena.
        </p>

        {(isButton || device.kind === "switch" || protocol === "zwave") && (
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

      {device.readingLabel && (
        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-stone-900">Tila</h3>
          <p className="mt-2 text-sm text-stone-700">{device.readingLabel}</p>
        </section>
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
