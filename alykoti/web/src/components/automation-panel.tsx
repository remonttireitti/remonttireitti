"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  deleteAutomationRule,
  saveAutomationRule,
  toggleAutomationRule,
  type AutomationActionState,
} from "@/app/actions/automations";
import {
  ACTION_LABELS,
  PRESS_LABELS,
  type AutomationActionType,
  type AutomationPressType,
  type LightAutomationRule,
} from "@/lib/automation";
import {
  protocolLabel,
  type AutomationDeviceOption,
  type AutomationTargetGroups,
} from "@/lib/automation-devices";

type AutomationsResponse = {
  configured: boolean;
  hubOnline?: boolean;
  rules: LightAutomationRule[];
  triggers: AutomationDeviceOption[];
  targets: AutomationTargetGroups;
  error?: string;
};

const EMPTY_FORM = {
  id: "",
  name: "",
  enabled: true,
  trigger_device_id: "",
  trigger_press: "short" as AutomationPressType,
  trigger_button: "",
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

export function AutomationPanel() {
  const [data, setData] = useState<AutomationsResponse | null>(null);
  const [flash, setFlash] = useState<AutomationActionState | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
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
        error: "Yhteys API:in epäonnistui",
      });
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 10_000);
    return () => clearInterval(id);
  }, [load]);

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
  }

  function editRule(rule: LightAutomationRule) {
    setEditingId(rule.id);
    setForm({
      id: rule.id,
      name: rule.name,
      enabled: rule.enabled,
      trigger_device_id: rule.trigger.device_id,
      trigger_press: rule.trigger.press,
      trigger_button: rule.trigger.button ?? "",
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
  const targetCount =
    targets.lights.length + targets.switches.length + targets.locks.length + targets.other.length;

  function deviceLabel(deviceId: string): string {
    const all = [...triggers, ...targets.lights, ...targets.switches, ...targets.locks, ...targets.other];
    return all.find((d) => d.id === deviceId)?.name ?? deviceId.replace(/^[^:]+:/, "");
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
          Yellow ei ole online — säännöt tallentuvat pilveen, mutta suoritus vaatii Pi-yhteyden.
        </div>
      )}

      {triggers.length === 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-semibold">Ei laukaisimia</p>
          <p className="mt-1">
            Parita langaton kytkin, anturi tai muu laukaisin. Yellow tunnistaa laitteet seuraavassa synkissä.
          </p>
        </div>
      )}

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-900">
          {editingId ? "Muokkaa sääntöä" : "Uusi automaatio"}
        </h2>
        <p className="mt-1 text-sm text-stone-600">
          Valitse mikä tahansa laukaisin (kytkin, anturi) ja kohde (valo, rele, lukko). Suoritus tapahtuu
          Yellowlla paikallisesti.
        </p>

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
            <span className="text-sm font-medium text-stone-700">Laukaisin</span>
            <select
              value={form.trigger_device_id}
              onChange={(e) => setForm((f) => ({ ...f, trigger_device_id: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
            >
              <option value="">Valitse laite…</option>
              {triggers.map((dev) => (
                <option key={dev.id} value={dev.id}>
                  {dev.name} · {protocolLabel(dev.protocol)} · {dev.kindLabel}
                  {dev.capabilitiesLabel !== "—" ? ` · ${dev.capabilitiesLabel}` : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-stone-700">Painallus / tapahtuma</span>
            <select
              value={form.trigger_press}
              onChange={(e) =>
                setForm((f) => ({ ...f, trigger_press: e.target.value as AutomationPressType }))
              }
              className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
            >
              {(Object.keys(PRESS_LABELS) as AutomationPressType[]).map((key) => (
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
            <span className="text-sm font-medium text-stone-700">Toiminto</span>
            <select
              value={form.action_type}
              onChange={(e) =>
                setForm((f) => ({ ...f, action_type: e.target.value as AutomationActionType }))
              }
              className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
            >
              {(Object.keys(ACTION_LABELS) as AutomationActionType[]).map((key) => (
                <option key={key} value={key}>
                  {ACTION_LABELS[key]}
                </option>
              ))}
            </select>
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
                            <span className="ml-auto shrink-0 text-xs text-stone-500">
                              {protocolLabel(device.protocol)}
                            </span>
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
            disabled={pending || !form.trigger_device_id || form.target_ids.length === 0}
            onClick={() =>
              run(() =>
                saveAutomationRule({
                  id: form.id || undefined,
                  name: form.name,
                  enabled: form.enabled,
                  trigger_device_id: form.trigger_device_id,
                  trigger_press: form.trigger_press,
                  trigger_button: form.trigger_button || null,
                  action_type: form.action_type,
                  target_ids: form.target_ids,
                  brightness_pct: form.brightness_pct,
                }),
              )
            }
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
        <h2 className="text-lg font-semibold text-stone-900">Säännöt ({rules.length})</h2>
        {rules.length === 0 ? (
          <p className="mt-3 text-sm text-stone-600">Ei automaatioita vielä.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {rules.map((rule) => (
              <li
                key={rule.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-stone-900">{rule.name}</p>
                  <p className="mt-0.5 text-xs text-stone-500">
                    {deviceLabel(rule.trigger.device_id)} · {PRESS_LABELS[rule.trigger.press]}
                    {rule.trigger.button ? ` · ${rule.trigger.button}` : ""} →{" "}
                    {ACTION_LABELS[rule.action.type]}
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
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-stone-100 bg-stone-50 p-4 text-xs text-stone-600">
        <p className="font-semibold text-stone-800">Huomioita</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>
            Painikkeet: Zigbee2MQTT lähettää <code className="text-stone-700">action</code>-kentän (single,
            hold, double…).
          </li>
          <li>Kytkimet ja releet ovat erillisessä ryhmässä — eivät sekoitu valoihin.</li>
          <li>Lukon toiminnot vaativat Z-Wave-lukon CC 98 -tuen Yellowlla.</li>
          <li>Anturilaukaisimet (ovi, liike) tulevat myöhemmin — valitse jo nyt listasta.</li>
        </ul>
      </section>
    </div>
  );
}
