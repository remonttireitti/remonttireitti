"use client";

import { useDeviceStatus } from "@/hooks/use-device-status";

export function DeviceOfflineAlert() {
  const { status, error } = useDeviceStatus();

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950"
      >
        <p className="font-semibold">Yhteystarkistus epäonnistui</p>
        <p className="mt-1">Palvelin ei vastaa. Yritetään uudelleen automaattisesti.</p>
      </div>
    );
  }

  if (!status || status.level === "ok") return null;

  if (status.level === "degraded") {
    return (
      <div
        role="status"
        className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
      >
        <p className="font-semibold">Keskusyksikkö offline</p>
        <p className="mt-1">AirFi toimii verkossa. Näyttö ja synkki eivät päivity ennen kuin hub on taas online.</p>
      </div>
    );
  }

  return (
    <div
      role="alert"
      className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950"
    >
      <p className="font-semibold">AirFi ei vastaa</p>
      <p className="mt-1">{status.message}</p>
    </div>
  );
}
