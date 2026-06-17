"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  clearAwayMode,
  extendFireplaceMode,
  extendHoodMode,
  setAutoMode,
  setAwayScheduled,
  setFanPct,
  setManualMode,
  type ActionState,
} from "@/app/actions/hubs";
import { CommandStatusPanel } from "@/components/command-status-panel";
import { FanGauge, FanTargetSlider } from "@/components/fan-gauge";
import { useDeviceStatus } from "@/hooks/use-device-status";
import { useMetricTrend } from "@/hooks/use-metric-trend";
import {
  activeTimedMode,
  effectiveControlMode,
  expireTimedModes,
  formatRemaining,
  remainingMs,
  timedModeLabel,
} from "@/lib/mode-schedule";
import type { Hub } from "@/lib/types";

const AWAY_HOURS = [2, 4, 8, 12] as const;

export function VentilationControls({ hub: initialHub }: { hub: Hub }) {
  const [pending, startTransition] = useTransition();
  const [flash, setFlash] = useState<ActionState | null>(null);
  const [trackIds, setTrackIds] = useState<string[]>([]);
  const [pressedKey, setPressedKey] = useState<string | null>(null);
  const [showAwayPicker, setShowAwayPicker] = useState(false);
  const { status } = useDeviceStatus();
  const { showTrend, modal } = useMetricTrend();
  const [, tick] = useState(0);

  const live = status?.live;
  const state = expireTimedModes({
    ...initialHub.state,
    fan_supply_pct: live?.fan_supply_pct ?? initialHub.state.fan_supply_pct,
    fan_exhaust_pct: live?.fan_exhaust_pct ?? initialHub.state.fan_exhaust_pct,
    fan_supply_target: live?.fan_supply_target ?? initialHub.state.fan_supply_target,
    fan_exhaust_target: live?.fan_exhaust_target ?? initialHub.state.fan_exhaust_target,
    fireplace_until: live?.fireplace_until ?? initialHub.state.fireplace_until,
    hood_until: live?.hood_until ?? initialHub.state.hood_until,
    away_until: live?.away_until ?? initialHub.state.away_until,
    away_unlimited: live?.away_unlimited ?? initialHub.state.away_unlimited,
    away_mode: live?.away_mode ?? initialHub.state.away_mode,
  });

  const effectiveMode = effectiveControlMode(
    (live?.control_mode as typeof initialHub.control_mode) ?? initialHub.control_mode,
    state,
  );
  const timed = activeTimedMode(state);

  const [supply, setSupply] = useState(
    state.fan_supply_target ?? state.fan_supply_pct ?? 40,
  );
  const [exhaust, setExhaust] = useState(
    state.fan_exhaust_target ?? state.fan_exhaust_pct ?? 40,
  );

  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  function run(key: string, action: () => Promise<ActionState>) {
    if (pending) return;
    setPressedKey(key);
    setTimeout(() => setPressedKey(null), 400);
    startTransition(async () => {
      const result = await action();
      setFlash(result);
      if (result.commandIds?.length) {
        setTrackIds((prev) => [...result.commandIds!, ...prev].slice(0, 8));
      }
    });
  }

  const manualActive = effectiveMode === "manual";

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

        {timed && (
          <ActiveModeBanner kind={timed} state={state} />
        )}

        <section className="grid gap-4 sm:grid-cols-2">
          <FanGauge
            label="Tuloilma"
            value={state.fan_supply_pct}
            target={manualActive ? supply : state.fan_supply_target}
            onTrend={() => showTrend("fan_supply_pct")}
          />
          <FanGauge
            label="Poistoilma"
            value={state.fan_exhaust_pct}
            target={manualActive ? exhaust : state.fan_exhaust_target}
            onTrend={() => showTrend("fan_exhaust_pct")}
          />
        </section>

        <CommandStatusPanel trackIds={trackIds.length > 0 ? trackIds : undefined} />

        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-stone-900">Toimintatila</h2>
          <p className="mt-1 text-sm text-stone-600">
            Takka ja liesi: +15 min / painallus. Automaatti lopettaa erikoistilat.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <ModeChip
              label="Automaatti"
              active={effectiveMode === "auto" && !timed}
              pressed={pressedKey === "auto"}
              disabled={pending}
              onClick={() => run("auto", () => setAutoMode(initialHub.id))}
            />
            <ModeChip
              label="Manuaali"
              active={effectiveMode === "manual"}
              pressed={pressedKey === "manual"}
              disabled={pending}
              onClick={() => run("manual", () => setManualMode(initialHub.id))}
            />
            <ModeChip
              label="Takkatila"
              active={timed === "fireplace"}
              badge={timerBadge(state.fireplace_until)}
              pressed={pressedKey === "fireplace"}
              disabled={pending}
              onClick={() => run("fireplace", () => extendFireplaceMode(initialHub.id))}
            />
            <ModeChip
              label="Liesituuletin"
              active={timed === "hood"}
              badge={timerBadge(state.hood_until)}
              pressed={pressedKey === "hood"}
              disabled={pending}
              onClick={() => run("hood", () => extendHoodMode(initialHub.id))}
            />
            <ModeChip
              label="Poissa"
              active={timed === "away"}
              badge={
                state.away_unlimited
                  ? "∞"
                  : timerBadge(state.away_until)
              }
              pressed={pressedKey === "away"}
              disabled={pending}
              onClick={() => setShowAwayPicker((v) => !v)}
            />
          </div>

          {showAwayPicker && (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-stone-100 pt-4">
              {AWAY_HOURS.map((h) => (
                <button
                  key={h}
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    run(`away-${h}`, () => setAwayScheduled(initialHub.id, h))
                  }
                  className="rounded-lg border border-stone-200 px-3 py-1.5 text-sm font-medium hover:bg-stone-50"
                >
                  {h} h
                </button>
              ))}
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  run("away-inf", () => setAwayScheduled(initialHub.id, null))
                }
                className="rounded-lg border border-stone-200 px-3 py-1.5 text-sm font-medium hover:bg-stone-50"
              >
                Rajaton
              </button>
              {timed === "away" && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run("away-off", () => clearAwayMode(initialHub.id))}
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-900"
                >
                  Lopeta poissa
                </button>
              )}
            </div>
          )}
        </section>

        {manualActive && (
          <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-stone-900">Manuaalinen ohjaus</h2>
            <p className="mt-1 text-sm text-stone-500">
              Yläpuolen mittarit näyttävät laitteen todellisen nopeuden. Säädä tavoite ja lähetä.
            </p>
            <div className="mt-5 space-y-5">
              <FanTargetSlider label="Tulo tavoite" value={supply} onChange={setSupply} />
              <FanTargetSlider label="Poisto tavoite" value={exhaust} onChange={setExhaust} />
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  run("send", () => setFanPct(initialHub.id, supply, exhaust))
                }
                className={`rounded-xl px-6 py-3 text-sm font-semibold text-white transition ${
                  pressedKey === "send"
                    ? "scale-[0.98] bg-emerald-700"
                    : "bg-stone-900 hover:bg-stone-800"
                } disabled:opacity-50`}
              >
                {pending ? "Lähetetään…" : "Lähetä laitteelle"}
              </button>
            </div>
          </section>
        )}
      </div>
    </>
  );
}

function timerBadge(until: string | null | undefined): string | undefined {
  const ms = remainingMs(until);
  if (ms == null) return undefined;
  return formatRemaining(ms);
}

function ActiveModeBanner({
  kind,
  state,
}: {
  kind: NonNullable<ReturnType<typeof activeTimedMode>>;
  state: ReturnType<typeof expireTimedModes>;
}) {
  let detail = "";
  if (kind === "fireplace") {
    detail = timerBadge(state.fireplace_until) ?? "";
  } else if (kind === "hood") {
    detail = timerBadge(state.hood_until) ?? "";
  } else if (state.away_unlimited) {
    detail = "kunnes lopetat";
  } else {
    detail = timerBadge(state.away_until) ?? "";
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <span className="font-semibold">{timedModeLabel(kind)} päällä</span>
      {detail && (
        <>
          <span className="mx-2 text-amber-300">·</span>
          <span>{detail} jäljellä</span>
        </>
      )}
    </div>
  );
}

function ModeChip({
  label,
  active,
  badge,
  pressed,
  disabled,
  onClick,
}: {
  label: string;
  active: boolean;
  badge?: string;
  pressed: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`relative rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
        pressed
          ? "scale-95 border-emerald-500 bg-emerald-100 text-emerald-950"
          : active
            ? "border-sky-600 bg-sky-50 text-sky-900"
            : "border-stone-200 bg-white text-stone-800 hover:bg-stone-50"
      } disabled:opacity-50`}
    >
      {label}
      {badge && (
        <span className="ml-2 rounded-full bg-stone-900/10 px-2 py-0.5 text-xs font-bold tabular-nums">
          {badge}
        </span>
      )}
    </button>
  );
}
