"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { CommandStatusPanel } from "@/components/command-status-panel";
import { useCommandStatus } from "@/hooks/use-command-status";

type CommandStatusContextValue = {
  trackCommandIds: (ids: string[]) => void;
  activeCount: number;
};

const CommandStatusContext = createContext<CommandStatusContextValue | null>(
  null,
);

export function CommandStatusProvider({ children }: { children: ReactNode }) {
  const [trackIds, setTrackIds] = useState<string[]>([]);
  const { commands, refresh } = useCommandStatus(
    trackIds.length > 0 ? trackIds : undefined,
  );

  const trackCommandIds = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return;
      setTrackIds((prev) => [...ids, ...prev].slice(0, 8));
      void refresh();
    },
    [refresh],
  );

  const value = useMemo(
    () => ({ trackCommandIds, activeCount: commands.length }),
    [trackCommandIds, commands.length],
  );

  return (
    <CommandStatusContext.Provider value={value}>
      <CommandStatusPanel commands={commands} />
      {children}
    </CommandStatusContext.Provider>
  );
}

export function useHubCommandStatus(): CommandStatusContextValue {
  const ctx = useContext(CommandStatusContext);
  if (!ctx) {
    throw new Error("useHubCommandStatus requires CommandStatusProvider");
  }
  return ctx;
}
