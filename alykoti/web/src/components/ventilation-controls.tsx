"use client";

import { useRef, useState, useTransition } from "react";
import {
  setAwayMode,
  setFanPct,
  setRunMode,
  type ActionState,
} from "@/app/actions/hubs";
import { CommandStatusPanel } from "@/components/command-status-panel";
import { useMetricTrend } from "@/hooks/use-metric-trend";
import type { Hub } from "@/lib/types";
import { MIN_FAN_PCT } from "@/lib/ventilation-logic";

const MODE_LABELS = {
  auto: "Automaatti",
  manual: "Manuaali",
  fireplace: "Takkatila",
  hood: "Liesituuletin",
} as const;

export function VentilationControls({ hub }: { hub: Hub }) {
  const [pending, startTransition] = useTransition();
  const [flash, setFlash] = useState<ActionState | null>(null);
  const [trackIds, setTrackIds] = useState<string[]>([]);
  const state = hub.state;
  const { showTrend, modal } = useMetricTrend();

  const [supply, setSupply] = useState(
    state.fan_supply_target ?? state.fan_supply_pct ?? 40,
  );
  const [exhaust, setExhaust] = useState(
    state.fan_exhaust_target ?? state.fan_exhaust_pct ?? 40,
  );

  function run(action: () => Promise<ActionState>) {
    startTransition(async () => {
      const result = await action();
      setFlash(result);
      if (result.commandIds?.length) {
        setTrackIds((prev) => [...result.commandIds!, ...prev].slice(0, 6));
      }
    });
  }

  return (
    <>
      {modal}
      <div className="space-y-6">
        {flash && (
          <div
            role="status"
            className={`rounded-xl border px-4 py-3 text-sm ${
              flash.error
                ? "border-red-200 bg-red-50 text-red-950"
                : "border-emerald-200 bg-emerald-50 text-emerald-950"
            }`}
          >
            {flash.error ?? flash.ok}
          </div>
        )}
        <CommandStatusPanel trackIds={trackIds.length > 0 ? trackIds : undefined} />
        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-stone-900">Toimintatila</h2>
          <p className="mt-1 text-sm text-stone-600">
            Takka- ja liesitila ohittavat automaation. Paina pitkään tilaa nähdäksesi historian.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {(["auto", "manual", "fireplace", "hood"] as const).map((mode) => (
              <ModeButton
                key={mode}
                label={MODE_LABELS[mode]}
                active={hub.control_mode === mode}
                disabled={pending}
                onSelect={() => run(() => setRunMode(hub.id, mode))}
                onTrend={() => showTrend("control_mode")}
              />
            ))}
          </div>
        </section>

        {hub.control_mode === "manual" && (
          <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-stone-900">Manuaalinen ohjaus</h2>
            <p className="mt-1 text-sm text-stone-500">Paina nopeusriviä nähdäksesi trendin.</p>
            <div className="mt-4 space-y-5">
              <FanSlider
                label="Tuloilma"
                value={supply}
                actual={state.fan_supply_pct}
                onChange={setSupply}
                onTrend={() => showTrend("fan_supply_pct")}
              />
              <FanSlider
                label="Poistoilma"
                value={exhaust}
                actual={state.fan_exhaust_pct}
                onChange={setExhaust}
                onTrend={() => showTrend("fan_exhaust_pct")}
              />
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => setFanPct(hub.id, supply, exhaust))}
                className="rounded-xl bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white"
              >
                Lähetä laitteelle
              </button>
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => setAwayMode(hub.id, !state.away_mode))}
            onContextMenu={(e) => {
              e.preventDefault();
              void showTrend("away_mode");
            }}
            className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold"
            title="Oikea klikkaus: trendi"
          >
            {state.away_mode ? "Kotona" : "Poissa"}
          </button>
          <p className="mt-2 text-xs text-stone-500">Oikea klikkaus: poissa-tilan historia</p>
        </section>
      </div>
    </>
  );
}

function ModeButton({
  label,
  active,
  disabled,
  onSelect,
  onTrend,
}: {
  label: string;
  active: boolean;
  disabled: boolean;
  onSelect: () => void;
  onTrend: () => void;
}) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (longPressed.current) {
          longPressed.current = false;
          return;
        }
        onSelect();
      }}
      onPointerDown={() => {
        longPressed.current = false;
        timer.current = setTimeout(() => {
          longPressed.current = true;
          onTrend();
        }, 500);
      }}
      onPointerUp={() => {
        if (timer.current) clearTimeout(timer.current);
      }}
      onPointerLeave={() => {
        if (timer.current) clearTimeout(timer.current);
      }}
      className={`rounded-xl border px-4 py-2 text-sm font-semibold ${
        active
          ? "border-sky-600 bg-sky-50 text-sky-900"
          : "border-stone-200 bg-white hover:bg-stone-50"
      }`}
      title="Paina pitkään: tilahistoria"
    >
      {label}
    </button>
  );
}

function FanSlider({
  label,
  value,
  actual,
  onChange,
  onTrend,
}: {
  label: string;
  value: number;
  actual?: number | null;
  onChange: (v: number) => void;
  onTrend: () => void;
}) {
  return (
    <label className="block text-sm">
      <button
        type="button"
        onClick={onTrend}
        className="flex w-full items-baseline justify-between rounded-lg px-1 py-0.5 text-left hover:bg-stone-50"
        title="Näytä trendi"
      >
        <span className="font-semibold text-stone-800">{label}</span>
        <span className="text-stone-600">
          {value} %
          {actual != null && (
            <span className="ml-2 text-xs text-stone-500">(laite {Math.round(actual)} %)</span>
          )}
        </span>
      </button>
      <input
        type="range"
        min={MIN_FAN_PCT}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-stone-900"
      />
    </label>
  );
}
