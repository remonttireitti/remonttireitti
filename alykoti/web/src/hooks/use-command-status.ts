"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CommandRow } from "@/app/api/device/commands/route";

const POLL_ACTIVE_MS = 1_500;
const POLL_IDLE_MS = 30_000;

export function isCommandActive(status: string): boolean {
  return status === "pending" || status === "delivered";
}

export function commandStatusLabel(status: string): string {
  switch (status) {
    case "pending":
      return "Odottaa";
    case "delivered":
      return "Suoritetaan";
    case "acked":
      return "Suoritettu";
    case "failed":
      return "Epäonnistui";
    default:
      return status;
  }
}

export function commandSummary(cmd: CommandRow): string {
  if (cmd.command === "set_fan_pct") {
    const supply = cmd.payload.supply_pct;
    const exhaust = cmd.payload.exhaust_pct;
    const fp = cmd.payload.fireplace === true ? " · takka" : "";
    return `Nopeus ${supply} % / ${exhaust} %${fp}`;
  }
  if (cmd.command === "set_mode") {
    return `Tila: ${String(cmd.payload.mode ?? "?")}`;
  }
  if (cmd.command === "set_away") {
    return cmd.payload.away ? "Poissa-tila päälle" : "Kotona-tila";
  }
  if (cmd.command === "set_temp_setpoint") {
    return `Lämpötila-asetus ${String(cmd.payload.temp_c ?? "?")} °C`;
  }
  if (cmd.command === "set_sauna_mode") {
    return cmd.payload.active ? "Saunatila päälle" : "Saunatila pois";
  }
  if (cmd.command === "ack_airfi_alarms") {
    return "Hälytysten kuittaus";
  }
  if (cmd.command === "set_fireplace_mode") {
    return cmd.payload.active ? "Ohitus päälle" : "Ohitus pois";
  }
  if (cmd.command === "set_fan_speed_level") {
    return `Nopeustaso ${String(cmd.payload.level ?? "?")}`;
  }
  return cmd.command;
}

export function useCommandStatus(trackIds?: string[]) {
  const [commands, setCommands] = useState<CommandRow[]>([]);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/device/commands", { cache: "no-store" });
      if (!res.ok) return;
      const body = (await res.json()) as { commands?: CommandRow[] };
      setCommands(body.commands ?? []);
    } catch {
      // ignore
    }
  }, []);

  const active = useMemo(() => {
    const inFlight = commands.filter((c) => isCommandActive(c.status));
    if (trackIds && trackIds.length > 0) {
      const tracked = inFlight.filter((c) => trackIds.includes(c.id));
      return tracked.length > 0 ? tracked : inFlight;
    }
    return inFlight;
  }, [commands, trackIds]);

  const activeIds = useMemo(() => active.map((c) => c.id), [active]);

  useEffect(() => {
    void refresh();
  }, [refresh, trackIds]);

  useEffect(() => {
    const ms = active.length > 0 ? POLL_ACTIVE_MS : POLL_IDLE_MS;
    const id = setInterval(() => void refresh(), ms);
    return () => clearInterval(id);
  }, [refresh, active.length]);

  const allAcked =
    trackIds != null &&
    trackIds.length > 0 &&
    trackIds.every(
      (id) =>
        !activeIds.includes(id) &&
        commands.some(
          (c) =>
            c.id === id && (c.status === "acked" || c.status === "failed"),
        ),
    );

  return { commands: active, activeIds, allAcked, refresh };
}
