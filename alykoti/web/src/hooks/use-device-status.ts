"use client";

import { useCallback, useEffect, useState } from "react";
import {
  PING_INTERVAL_MS,
  type DeviceStatus,
} from "@/lib/device-status";

export function useDeviceStatus(intervalMs = PING_INTERVAL_MS) {
  const [status, setStatus] = useState<DeviceStatus | null>(null);
  const [error, setError] = useState(false);

  const ping = useCallback(async () => {
    try {
      const res = await fetch("/api/device/status", { cache: "no-store" });
      if (!res.ok) {
        setError(true);
        return;
      }
      setError(false);
      setStatus(await res.json());
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    void ping();
    const id = setInterval(() => void ping(), intervalMs);
    return () => clearInterval(id);
  }, [ping, intervalMs]);

  return { status, error, ping };
}
