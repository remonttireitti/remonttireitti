"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { NavAudience } from "@/lib/role-nav-paths";

export type RoleNavState = {
  loggedIn: boolean;
  isCustomer: boolean;
  isContractor: boolean;
};

type GateRequest = {
  audience: NavAudience;
  href: string;
};

type RoleNavContextValue = RoleNavState & {
  gate: GateRequest | null;
  openGate: (request: GateRequest) => void;
  closeGate: () => void;
};

const RoleNavContext = createContext<RoleNavContextValue | null>(null);

export function RoleNavProvider({
  children,
  loggedIn,
  isCustomer,
  isContractor,
}: RoleNavState & { children: ReactNode }) {
  const [gate, setGate] = useState<GateRequest | null>(null);

  const openGate = useCallback((request: GateRequest) => {
    setGate(request);
  }, []);

  const closeGate = useCallback(() => {
    setGate(null);
  }, []);

  const value = useMemo(
    () => ({
      loggedIn,
      isCustomer,
      isContractor,
      gate,
      openGate,
      closeGate,
    }),
    [loggedIn, isCustomer, isContractor, gate, openGate, closeGate],
  );

  return (
    <RoleNavContext.Provider value={value}>{children}</RoleNavContext.Provider>
  );
}

export function useRoleNav() {
  const ctx = useContext(RoleNavContext);
  if (!ctx) {
    return {
      loggedIn: false,
      isCustomer: false,
      isContractor: false,
      gate: null,
      openGate: () => {},
      closeGate: () => {},
    } satisfies RoleNavContextValue;
  }
  return ctx;
}
