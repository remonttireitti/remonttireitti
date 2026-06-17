"use client";

import { useCallback, useEffect, useState } from "react";
import type { CommandRow } from "@/app/api/device/commands/route";

const POLL_MS = 5_000;

export function commandStatusLabel(status: string): string {
  switch (status) {
    case "pending":
      return "Odottaa hubia";
    case "delivered":
      return "Hubilla — suoritetaan";
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

  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  const tracked =
    trackIds && trackIds.length > 0
      ? commands.filter((c) => trackIds.includes(c.id))
      : commands.slice(0, 3);

  const allAcked =
    tracked.length > 0 && tracked.every((c) => c.status === "acked" || c.status === "failed");

  return { commands: tracked, allAcked, refresh };
}
