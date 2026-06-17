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
        <p className="font-semibold">
          {!status.hub.online
            ? "Keskusyksikkö offline"
            : "Hub ei saa yhteyttä AirFiin"}
        </p>
        <p className="mt-1">
          {!status.hub.online
            ? "ESP32-silta ei synkkaa pilveen. Tarkista WiFi ja sync_url."
            : "Hub on verkossa mutta ei saa Modbus-yhteyttä AirFiin lähiverkossa."}
        </p>
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
