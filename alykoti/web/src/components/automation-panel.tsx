"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  deleteAutomationRule,
  installSaunaShowerMirrorPresets,
  saveAutomationRule,
  toggleAutomationRule,
  type AutomationActionState,
} from "@/app/actions/automations";
import {
  ACTION_LABELS,
  isDeviceTrigger,
  isElectricityPriceTrigger,
  PRESS_LABELS,
  TRIGGER_MODE_LABELS,
  triggerSummary,
  TRIGGER_KIND_LABELS,
  type AutomationActionType,
  type AutomationPressType,
  type AutomationRule,
  type AutomationTriggerMode,
} from "@/lib/automation";
import {
  actionsForTargetGroup,
  KNOWN_MQTT_ACTIONS,
  mqttActionLabel,
  pressTypesForTrigger,
} from "@/lib/automation-actions";
import {
  HUE_4BTN_BUTTONS,
  HUE_4BTN_GESTURES,
  HUE_4BTN_MQTT_ACTIONS,
  hueGestureFromParsed,
  hueMqttActionLabel,
  hueTriggerFields,
  parseHueMqttAction,
  recommendedHueTrigger,
  triggerProfileForDevice,
  type Hue4BtnButton,
  type Hue4BtnGesture,
} from "@/lib/automation-trigger-profiles";
import { protocolLabel } from "@/lib/device-protocol";
import {
  type AutomationDeviceOption,
  type AutomationTargetGroups,
} from "@/lib/automation-devices";
import type { HubLightDevice } from "@/lib/hub-lights";
import type { ElectricityPricePeriod } from "@/lib/electricity-price-periods";
import { ElectricityPricePeriodsPanel } from "@/components/electricity-price-periods-panel";
import {
  AUTOMATION_STAGE_LABELS,
  formatAutomationEventTime,
  type AutomationEvent,
} from "@/lib/automation-events";

type AutomationsResponse = {
  configured: boolean;
  hubOnline?: boolean;
  rules: AutomationRule[];
  triggers: AutomationDeviceOption[];
  targets: AutomationTargetGroups;
  devices: HubLightDevice[];
  electricityPricePeriods: ElectricityPricePeriod[];
  automationEvents?: AutomationEvent[];
  error?: string;
};

const EMPTY_FORM = {
  id: "",
  name: "",
  enabled: true,
  trigger_kind: "device" as "device" | "electricity_price",
  trigger_device_id: "",
  trigger_mode: "action" as AutomationTriggerMode,
  trigger_press: "short" as AutomationPressType,
  trigger_endpoint: "" as string,
  trigger_button: "",
  trigger_action: "",
  hue_button: "on" as Hue4BtnButton,
  hue_gesture: "press" as Hue4BtnGesture,
  trigger_period_id: "",
  action_type: "toggle" as AutomationActionType,
  target_ids: [] as string[],
  brightness_pct: 50,
};

const TARGET_SECTIONS: { key: keyof AutomationTargetGroups; title: string }[] = [
  { key: "lights", title: "Valot" },
  { key: "switches", title: "Kytkimet ja releet" },
  { key: "locks", title: "Lukot" },
  { key: "other", title: "Muut" },
];

type Props = {
  initialTriggerDevice?: string;
  initialTriggerPress?: AutomationPressType;
  initialTriggerButton?: string;
  initialTriggerAction?: string;
};

export function AutomationPanel({
  initialTriggerDevice,
  initialTriggerPress,
  initialTriggerButton,
  initialTriggerAction,
}: Props) {
  const initialHueParsed = initialTriggerAction ? parseHueMqttAction(initialTriggerAction) : null;
  const initialHueGesture = hueGestureFromParsed(initialHueParsed?.gesture);

  const [data, setData] = useState<AutomationsResponse | null>(null);
  const [flash, setFlash] = useState<AutomationActionState | null>(null);
  const [form, setForm] = useState({
    ...EMPTY_FORM,
    trigger_device_id: initialTriggerDevice ?? "",
    trigger_mode: "action",
    trigger_press: initialTriggerPress ?? "short",
    trigger_endpoint: "",
    trigger_button: initialTriggerButton ?? "",
    trigger_action: initialTriggerAction ?? "",
    hue_button: initialHueParsed?.button ?? "on",
    hue_gesture: initialHueGesture,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [trackRuleId, setTrackRuleId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/automations", { cache: "no-store" });
      const json = (await res.json()) as AutomationsResponse;
      setData(json);
    } catch {
      setData({
        configured: false,
        rules: [],
        triggers: [],
        targets: { lights: [], switches: [], locks: [], other: [] },
        devices: [],
        electricityPricePeriods: [],
        error: "Yhteys API:in epäonnistui",
      });
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 10_000);
    return () => clearInterval(id);
  }, [load]);

  const selectedTriggerDevice = useMemo(() => {
    const devices = data?.devices ?? [];
    return devices.find((d) => d.id === form.trigger_device_id);
  }, [data?.devices, form.trigger_device_id]);

  const selectedTargets = useMemo(() => {
    const devices = data?.devices ?? [];
    return devices.filter((d) => form.target_ids.includes(d.id));
  }, [data?.devices, form.target_ids]);

  const allowedActions = useMemo(() => {
    if (form.trigger_mode === "switch_state") {
      return ["mirror"] as AutomationActionType[];
    }
    return actionsForTargetGroup(selectedTargets);
  }, [form.trigger_mode, selectedTargets]);

  const pressTypes = useMemo(
    () => pressTypesForTrigger(selectedTriggerDevice?.capabilities),
    [selectedTriggerDevice],
  );

  const hueFromEvents = useMemo(() => {
    const events = data?.automationEvents ?? [];
    return events.some(
      (e) =>
        e.device_id === form.trigger_device_id &&
        e.mqtt_action &&
        parseHueMqttAction(e.mqtt_action),
    );
  }, [data?.automationEvents, form.trigger_device_id]);

  const triggerProfile = useMemo(() => {
    if (selectedTriggerDevice && triggerProfileForDevice(selectedTriggerDevice) === "hue_4btn") {
      return "hue_4btn" as const;
    }
    return hueFromEvents ? ("hue_4btn" as const) : ("generic" as const);
  }, [selectedTriggerDevice, hueFromEvents]);

  useEffect(() => {
    if (!allowedActions.includes(form.action_type) && allowedActions.length > 0) {
      setForm((f) => ({ ...f, action_type: allowedActions[0]! }));
    }
  }, [allowedActions, form.action_type]);

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
  }

  function editRule(rule: AutomationRule) {
    setEditingId(rule.id);
    if (isElectricityPriceTrigger(rule.trigger)) {
      setForm({
        id: rule.id,
        name: rule.name,
        enabled: rule.enabled,
        trigger_kind: "electricity_price",
        trigger_device_id: "",
        trigger_mode: "action",
        trigger_press: "short",
        trigger_endpoint: "",
        trigger_button: "",
        trigger_action: "",
        hue_button: "on",
        hue_gesture: "press",
        trigger_period_id: rule.trigger.period_id,
        action_type: rule.action.type,
        target_ids: [...rule.action.target_ids],
        brightness_pct: rule.action.brightness_pct ?? 50,
      });
      return;
    }

    const hueParsed = rule.trigger.action ? parseHueMqttAction(rule.trigger.action) : null;
    const hueGesture = hueGestureFromParsed(hueParsed?.gesture);

    setForm({
      id: rule.id,
      name: rule.name,
      enabled: rule.enabled,
      trigger_kind: "device",
      trigger_device_id: rule.trigger.device_id,
      trigger_mode: rule.trigger.mode ?? "action",
      trigger_press: rule.trigger.press,
      trigger_endpoint:
        rule.trigger.endpoint != null ? String(rule.trigger.endpoint) : "",
      trigger_button: rule.trigger.button ?? "",
      trigger_action: rule.trigger.action ?? "",
      hue_button: hueParsed?.button ?? "on",
      hue_gesture: hueGesture,
      trigger_period_id: "",
      action_type: rule.action.type,
      target_ids: [...rule.action.target_ids],
      brightness_pct: rule.action.brightness_pct ?? 50,
    });
  }

  function run(action: () => Promise<AutomationActionState>) {
    startTransition(async () => {
      const result = await action();
      setFlash(result);
      if (result.ok) {
        resetForm();
        await load();
      }
    });
  }

  function toggleTarget(id: string) {
    setForm((prev) => {
      const has = prev.target_ids.includes(id);
      return {
        ...prev,
        target_ids: has ? prev.target_ids.filter((x) => x !== id) : [...prev.target_ids, id],
      };
    });
  }

  const rules = data?.rules ?? [];
  const triggers = data?.triggers ?? [];
  const targets = data?.targets ?? { lights: [], switches: [], locks: [], other: [] };
  const periods = data?.electricityPricePeriods ?? [];
  const automationEvents = data?.automationEvents ?? [];
  const targetCount =
    targets.lights.length + targets.switches.length + targets.locks.length + targets.other.length;

  function deviceLabel(deviceId: string): string {
    const all = [...triggers, ...targets.lights, ...targets.switches, ...targets.locks, ...targets.other];
    return all.find((d) => d.id === deviceId)?.name ?? deviceId.replace(/^[^:]+:/, "");
  }

  function ruleTriggerSummary(rule: AutomationRule): string {
    if (isElectricityPriceTrigger(rule.trigger)) {
      const priceTrigger = rule.trigger;
      const period = periods.find((p) => p.id === priceTrigger.period_id);
      return triggerSummary(priceTrigger, "", period);
    }
    if (isDeviceTrigger(rule.trigger) && rule.trigger.action && parseHueMqttAction(rule.trigger.action)) {
      return `${deviceLabel(rule.trigger.device_id)} · ${hueMqttActionLabel(rule.trigger.action)}`;
    }
    if (isDeviceTrigger(rule.trigger)) {
      return triggerSummary(rule.trigger, deviceLabel(rule.trigger.device_id));
    }
    return "";
  }

  return (
    <div className="mt-6 space-y-6">
      {flash?.ok && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-900">
          {flash.ok}
        </div>
      )}
      {flash?.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          {flash.error}
        </div>
      )}

      {data?.hubOnline === false && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          Yellow ei ole online — säännöt tallentuvat pilveen. Laiteautomaatiot vaativat Pi-yhteyden,
          sähköhinta-automaatiot ajetaan pilvestä.
        </div>
      )}

      <section className="rounded-2xl border border-blue-200 bg-blue-50/80 p-4 text-sm text-blue-950">
        <p className="font-semibold">Miten automaatiot toimivat</p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-blue-900/90">
          <li>
            <strong>Laite (Zigbee painike):</strong> säännöt tallennetaan Supabaseen (web UI). Yellow
            hakee ne ~30 s välein synkissä ja suorittaa <em>paikallisesti MQTT:stä</em> — painallus ei
            kulje webin kautta.
          </li>
          <li>
            <strong>Sähkön hinta:</strong> pilven cron laukaisee säännöt (ei Yellowia).
          </li>
          <li>
            Sääntöjä voi muokata vain webistä; Yellow vain lukee listan. Seuranta näkyy alla kun painat
            nappia.
          </li>
        </ul>
      </section>

      <ElectricityPricePeriodsPanel periods={periods} />

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-900">
          {editingId ? "Muokkaa sääntöä" : "Uusi automaatio"}
        </h2>
        <p className="mt-1 text-sm text-stone-600">
          Valitse laukaisin (laite tai sähkön hinta) ja kohde. Laiteautomaatiot suoritetaan Yellowlla,
          sähköhinta-automaatiot pilven cronilla (15 min).
        </p>
        <div className="mt-3">
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => installSaunaShowerMirrorPresets())}
            className="rounded-xl border border-stone-300 bg-stone-50 px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-100 disabled:opacity-50"
          >
            Luo sauna- ja suihkuvalosäännöt (eteisen kytkin)
          </button>
          <p className="mt-1 text-xs text-stone-500">
            Kanava 1 → saunavalot (takkahuone + eteinen), kanava 2 → suihkuvalot. Peilaa tilan, ei togglea.
          </p>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-stone-700">Nimi</span>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Esim. Eteinen päälle"
              className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-stone-700">Laukaisimen tyyppi</span>
            <select
              value={form.trigger_kind}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  trigger_kind: e.target.value as "device" | "electricity_price",
                }))
              }
              className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
            >
              <option value="device">{TRIGGER_KIND_LABELS.device}</option>
              <option value="electricity_price">{TRIGGER_KIND_LABELS.electricity_price}</option>
            </select>
          </label>

          {form.trigger_kind === "device" ? (
            <>
              <label className="block sm:col-span-2">
                <span className="text-sm font-medium text-stone-700">Laukaisinlaite</span>
                <select
                  value={form.trigger_device_id}
                  onChange={(e) => setForm((f) => ({ ...f, trigger_device_id: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
                >
                  <option value="">Valitse laite…</option>
                  {triggers.map((dev) => (
                    <option key={dev.id} value={dev.id}>
                      {dev.name} · {protocolLabel(dev.protocol)} · {dev.kindLabel}
                    </option>
                  ))}
                </select>
                {triggers.length === 0 && (
                  <p className="mt-1 text-xs text-amber-700">
                    Ei laukaisimia — paraa kytkin tai avaa laitesivu live-tapahtumille.
                  </p>
                )}
              </label>

              {triggerProfile !== "hue_4btn" && (
                <label className="block sm:col-span-2">
                  <span className="text-sm font-medium text-stone-700">Laukaisutapa</span>
                  <select
                    value={form.trigger_mode}
                    onChange={(e) => {
                      const mode = e.target.value as AutomationTriggerMode;
                      setForm((f) => ({
                        ...f,
                        trigger_mode: mode,
                        action_type: mode === "switch_state" ? "mirror" : f.action_type,
                      }));
                    }}
                    className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
                  >
                    <option value="action">{TRIGGER_MODE_LABELS.action}</option>
                    <option value="switch_state">{TRIGGER_MODE_LABELS.switch_state}</option>
                  </select>
                  {form.trigger_mode === "switch_state" && (
                    <p className="mt-1 text-xs text-stone-600">
                      Kytkin ON → kaikki kohteet päälle, OFF → pois. Ei togglea — vähentää räpsintää.
                    </p>
                  )}
                </label>
              )}

              {form.trigger_mode === "switch_state" && form.trigger_device_id.startsWith("zwave:") && (
                <label className="block">
                  <span className="text-sm font-medium text-stone-700">Z-Wave kanava</span>
                  <input
                    type="number"
                    min={0}
                    max={4}
                    value={form.trigger_endpoint}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, trigger_endpoint: e.target.value }))
                    }
                    placeholder="1 tai 2"
                    className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
                  />
                  <p className="mt-1 text-xs text-stone-500">Eteisen valokytkin: 1 = sauna, 2 = suihku.</p>
                </label>
              )}

              {triggerProfile === "hue_4btn" ? (
                <>
                  <p className="sm:col-span-2 text-xs text-stone-600">
                    Philips Hue 4-painike — kaikki Zigbee2MQTT-actionit (on_press … down_hold_release).
                  </p>
                  <label className="block sm:col-span-2">
                    <span className="text-sm font-medium text-stone-700">MQTT-action</span>
                    <select
                      value={hueTriggerFields(form.hue_button, form.hue_gesture).action}
                      onChange={(e) => {
                        const parsed = parseHueMqttAction(e.target.value);
                        if (!parsed) return;
                        setForm((f) => ({
                          ...f,
                          hue_button: parsed.button,
                          hue_gesture: parsed.gesture,
                        }));
                      }}
                      className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm font-mono"
                    >
                      {HUE_4BTN_MQTT_ACTIONS.map((action) => (
                        <option key={action} value={action}>
                          {action} — {hueMqttActionLabel(action)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-stone-700">Painike</span>
                    <select
                      value={form.hue_button}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          hue_button: e.target.value as Hue4BtnButton,
                        }))
                      }
                      className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
                    >
                      {HUE_4BTN_BUTTONS.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-stone-700">Ele</span>
                    <select
                      value={form.hue_gesture}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          hue_gesture: e.target.value as Hue4BtnGesture,
                        }))
                      }
                      className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
                    >
                      {HUE_4BTN_GESTURES.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              ) : form.trigger_mode === "switch_state" ? null : (
                <>
                  <label className="block">
                    <span className="text-sm font-medium text-stone-700">Painallustyyppi</span>
                    <select
                      value={form.trigger_press}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          trigger_press: e.target.value as AutomationPressType,
                        }))
                      }
                      className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
                    >
                      {pressTypes.map((key) => (
                        <option key={key} value={key}>
                          {PRESS_LABELS[key]}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-stone-700">Painike (valinnainen)</span>
                    <input
                      type="text"
                      value={form.trigger_button}
                      onChange={(e) => setForm((f) => ({ ...f, trigger_button: e.target.value }))}
                      placeholder="button_1, left…"
                      className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
                    />
                  </label>

                  <label className="block sm:col-span-2">
                    <span className="text-sm font-medium text-stone-700">
                      Tarkka MQTT-action (valinnainen)
                    </span>
                    <select
                      value={form.trigger_action}
                      onChange={(e) => setForm((f) => ({ ...f, trigger_action: e.target.value }))}
                      className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
                    >
                      <option value="">Mikä tahansa valitun painallustyypin mukainen</option>
                      {KNOWN_MQTT_ACTIONS.map((action) => (
                        <option key={action} value={action}>
                          {action} — {mqttActionLabel(action)}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              )}
            </>
          ) : (
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium text-stone-700">Sähköhintajakso</span>
              <select
                value={form.trigger_period_id}
                onChange={(e) => setForm((f) => ({ ...f, trigger_period_id: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
              >
                <option value="">Valitse jakso…</option>
                {periods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {periods.length === 0 && (
                <p className="mt-1 text-xs text-amber-700">Luo ensin halvin jakso yllä.</p>
              )}
            </label>
          )}

          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-stone-700">Toiminto</span>
            <select
              value={form.action_type}
              onChange={(e) => {
                const action_type = e.target.value as AutomationActionType;
                setForm((f) => {
                  const next = { ...f, action_type };
                  if (triggerProfile === "hue_4btn") {
                    const rec = recommendedHueTrigger(action_type);
                    if (rec) {
                      next.hue_button = rec.button;
                      next.hue_gesture = rec.gesture;
                    }
                  }
                  return next;
                });
              }}
              className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
            >
              {allowedActions.map((key) => (
                <option key={key} value={key}>
                  {ACTION_LABELS[key]}
                </option>
              ))}
            </select>
            {selectedTargets.length > 0 && (
              <p className="mt-1 text-xs text-stone-500">
                Toiminnot suodatettu valittujen kohteiden ominaisuuksien mukaan.
              </p>
            )}
          </label>

          {form.action_type === "set_brightness" && (
            <label className="block">
              <span className="text-sm font-medium text-stone-700">Kirkkaus %</span>
              <input
                type="number"
                min={0}
                max={100}
                value={form.brightness_pct}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    brightness_pct: Number.parseInt(e.target.value, 10) || 0,
                  }))
                }
                className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
              />
            </label>
          )}
        </div>

        <div className="mt-4 space-y-4">
          <p className="text-sm font-medium text-stone-700">Kohteet</p>
          {targetCount === 0 ? (
            <p className="text-sm text-stone-500">Ei ohjattavia laitteita.</p>
          ) : (
            TARGET_SECTIONS.map(({ key, title }) => {
              const items = targets[key];
              if (items.length === 0) return null;
              return (
                <div key={key}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{title}</p>
                  <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                    {items.map((device) => {
                      const checked = form.target_ids.includes(device.id);
                      return (
                        <li key={device.id}>
                          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleTarget(device.id)}
                              className="rounded border-stone-300"
                            />
                            <span className="min-w-0 truncate">{device.name}</span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })
          )}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={
              pending ||
              form.target_ids.length === 0 ||
              (form.trigger_kind === "device" && !form.trigger_device_id) ||
              (form.trigger_kind === "electricity_price" && !form.trigger_period_id)
            }
            onClick={() => {
              const endpointRaw = form.trigger_endpoint.trim();
              const endpoint =
                endpointRaw && Number.isFinite(Number.parseInt(endpointRaw, 10))
                  ? Number.parseInt(endpointRaw, 10)
                  : null;
              const trigger =
                form.trigger_kind === "device" && triggerProfile === "hue_4btn"
                  ? hueTriggerFields(form.hue_button, form.hue_gesture)
                  : {
                      press: form.trigger_press,
                      button: form.trigger_button || null,
                      action: form.trigger_action || null,
                    };
              run(() =>
                saveAutomationRule({
                  id: form.id || undefined,
                  name: form.name,
                  enabled: form.enabled,
                  trigger_kind: form.trigger_kind,
                  trigger_device_id: form.trigger_device_id,
                  trigger_mode: form.trigger_mode,
                  trigger_press: trigger.press,
                  trigger_endpoint: endpoint,
                  trigger_button: trigger.button,
                  trigger_action: trigger.action,
                  trigger_period_id: form.trigger_period_id,
                  action_type:
                    form.trigger_mode === "switch_state" ? "mirror" : form.action_type,
                  target_ids: form.target_ids,
                  brightness_pct: form.brightness_pct,
                }),
              );
            }}
            className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-50"
          >
            {pending ? "Tallennetaan…" : editingId ? "Tallenna muutokset" : "Lisää sääntö"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
            >
              Peruuta
            </button>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-stone-900">Seuranta</h2>
          {trackRuleId && (
            <button
              type="button"
              onClick={() => setTrackRuleId(null)}
              className="text-xs font-medium text-stone-600 hover:text-stone-900"
            >
              Näytä kaikki
            </button>
          )}
        </div>
        <p className="mt-1 text-sm text-stone-600">
          Yellow raportoi tapahtumat synkissä (~30 s). Paina säännön kohdalla Seuranta suodattaaksesi.
        </p>
        {automationEvents.length === 0 ? (
          <p className="mt-3 text-sm text-stone-500">
            Ei tapahtumia vielä. Paina Zigbee-nappia tai odota Yellow-päivitystä.
          </p>
        ) : (
          <ul className="mt-3 max-h-64 space-y-1.5 overflow-y-auto text-xs">
            {automationEvents
              .filter((e) => !trackRuleId || e.rule_id === trackRuleId)
              .map((e, i) => (
                <li
                  key={`${e.at}-${i}`}
                  className={`flex flex-wrap items-baseline gap-x-2 rounded-lg px-2 py-1.5 ${
                    e.stage === "failed" || e.stage === "no_match"
                      ? "bg-amber-50 text-amber-950"
                      : e.stage === "ok"
                        ? "bg-emerald-50 text-emerald-950"
                        : "bg-stone-50 text-stone-800"
                  }`}
                >
                  <span className="tabular-nums text-stone-500">{formatAutomationEventTime(e.at)}</span>
                  <span className="font-semibold">{AUTOMATION_STAGE_LABELS[e.stage]}</span>
                  {e.rule_name && <span>{e.rule_name}</span>}
                  {e.mqtt_action && (
                    <span className="font-mono text-stone-600">
                      {e.mqtt_button ? `${e.mqtt_button} · ` : ""}
                      {hueMqttActionLabel(e.mqtt_action)}
                    </span>
                  )}
                  {e.target_id && (
                    <span className="truncate text-stone-600">→ {deviceLabel(e.target_id)}</span>
                  )}
                  {e.message && <span className="text-stone-500">{e.message}</span>}
                </li>
              ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-900">Säännöt ({rules.length})</h2>
        {rules.length === 0 ? (
          <p className="mt-3 text-sm text-stone-600">Ei automaatioita vielä.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {rules.map((rule) => {
              const summary = ruleTriggerSummary(rule);

              return (
                <li
                  key={rule.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-stone-900">{rule.name}</p>
                    <p className="mt-0.5 text-xs text-stone-500">
                      {summary} → {ACTION_LABELS[rule.action.type]}
                      {rule.action.target_ids.length > 0
                        ? ` (${rule.action.target_ids.length} kohdetta)`
                        : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <label className="flex items-center gap-1.5 text-xs text-stone-600">
                      <input
                        type="checkbox"
                        checked={rule.enabled}
                        disabled={pending}
                        onChange={(e) => run(() => toggleAutomationRule(rule.id, e.target.checked))}
                      />
                      Käytössä
                    </label>
                    <button
                      type="button"
                      onClick={() => setTrackRuleId(trackRuleId === rule.id ? null : rule.id)}
                      className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${
                        trackRuleId === rule.id
                          ? "border-blue-300 bg-blue-50 text-blue-900"
                          : "border-stone-200 hover:bg-white"
                      }`}
                    >
                      Seuranta
                    </button>
                    <button
                      type="button"
                      onClick={() => editRule(rule)}
                      className="rounded-lg border border-stone-200 px-2.5 py-1 text-xs font-medium hover:bg-white"
                    >
                      Muokkaa
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        if (window.confirm(`Poistetaanko "${rule.name}"?`)) {
                          run(() => deleteAutomationRule(rule.id));
                        }
                      }}
                      className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-800 hover:bg-red-50"
                    >
                      Poista
                    </button>
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
