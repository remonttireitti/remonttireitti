"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  connectAirthingsDevice,
  disconnectAirthingsDevice,
  type DeviceActionState,
} from "@/app/actions/integrations";
import type { AirthingsDeviceConfig } from "@/lib/types";

type AvailableDevice = {
  serial: string;
  name: string;
  deviceType?: string;
};

type LiveDevice = AirthingsDeviceConfig & {
  reachable: boolean;
  reading: {
    temperature_c?: number | null;
    humidity_pct?: number | null;
    co2_ppm?: number | null;
    tvoc_ppb?: number | null;
  } | null;
};

type AirthingsResponse = {
  configured: boolean;
  apiConfigured: boolean;
  hubOnline?: boolean;
  devices: AirthingsDeviceConfig[];
  available: AvailableDevice[];
  live: LiveDevice[];
  hubCo2?: number | null;
};

function formatReading(reading: LiveDevice["reading"]): string {
  if (!reading) return "Ei dataa";
  const parts: string[] = [];
  if (reading.temperature_c != null) parts.push(`${reading.temperature_c.toFixed(1)} °C`);
  if (reading.humidity_pct != null) parts.push(`${Math.round(reading.humidity_pct)} %`);
  if (reading.co2_ppm != null) parts.push(`${Math.round(reading.co2_ppm)} ppm`);
  return parts.join(" · ") || "Ei dataa";
}

export function AirthingsPanel() {
  const [data, setData] = useState<AirthingsResponse | null>(null);
  const [flash, setFlash] = useState<DeviceActionState | null>(null);
  const [selectedSerial, setSelectedSerial] = useState("");
  const [pending, startTransition] = useTransition();

  const load = useCallback(async () => {
    const res = await fetch("/api/integrations/airthings", { cache: "no-store" });
    setData((await res.json()) as AirthingsResponse);
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 10_000);
    return () => clearInterval(id);
  }, [load]);

  function run(action: () => Promise<DeviceActionState>) {
    startTransition(async () => {
      const result = await action();
      setFlash(result);
      if (result.ok) await load();
    });
  }

  const connected = new Set((data?.devices ?? []).map((d) => d.serial));
  const available = (data?.available ?? []).filter((d) => !connected.has(d.serial));
  const live = data?.live ?? [];

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

      {!data?.apiConfigured && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-semibold">Airthings API ei ole konfiguroitu</p>
          <p className="mt-1">
            Lisää Vercel-ympäristömuuttujat{" "}
            <code className="text-xs">AIRTHINGS_CLIENT_ID</code> ja{" "}
            <code className="text-xs">AIRTHINGS_CLIENT_SECRET</code>. Valinnainen:{" "}
            <code className="text-xs">AIRTHINGS_DEVICE_SERIAL</code>.
          </p>
        </div>
      )}

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-900">Yhdistä laite</h2>
        <p className="mt-1 text-sm text-stone-600">
          Airthings View Plus / Wave — ilmanlaatu pilvi-API:n kautta. Mittaukset näkyvät laitelistassa
          ja ilmanvaihdon CO₂-logiikassa.
        </p>

        {data?.apiConfigured && available.length > 0 ? (
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="block text-sm">
              <span className="text-stone-600">Laite</span>
              <select
                value={selectedSerial}
                onChange={(e) => setSelectedSerial(e.target.value)}
                className="mt-1 block min-w-[220px] rounded-lg border border-stone-200 px-3 py-2"
              >
                <option value="">Valitse…</option>
                {available.map((d) => (
                  <option key={d.serial} value={d.serial}>
                    {d.name} ({d.serial})
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={pending || !selectedSerial}
              onClick={() =>
                run(() => {
                  const item = available.find((d) => d.serial === selectedSerial);
                  return connectAirthingsDevice(selectedSerial, item?.name);
                })
              }
              className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-50"
            >
              Yhdistä
            </button>
          </div>
        ) : data?.apiConfigured ? (
          <p className="mt-4 text-sm text-stone-600">
            Kaikki tilillä olevat laitteet on jo yhdistetty tai tileillä ei ole laitteita.
          </p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-900">
          Yhdistetyt laitteet ({live.length})
        </h2>
        {live.length === 0 ? (
          <p className="mt-4 text-sm text-stone-600">Ei yhdistettyjä Airthings-laitteita.</p>
        ) : (
          <ul className="mt-4 divide-y divide-stone-100">
            {live.map((device) => (
              <li key={device.id} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0">
                <div>
                  <p className="font-medium text-stone-900">{device.name}</p>
                  <p className="text-xs text-stone-500">
                    {device.serial} · {formatReading(device.reading)}
                  </p>
                  <p className="mt-0.5 text-xs text-stone-400">
                    Ominaisuudet: lämpötila, kosteus, CO₂, TVOC, hiukkaset
                  </p>
                </div>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => disconnectAirthingsDevice(device.id))}
                  className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs text-stone-600"
                >
                  Poista
                </button>
              </li>
            ))}
          </ul>
        )}
        {data?.hubCo2 != null && (
          <p className="mt-4 text-xs text-stone-500">
            Hubin CO₂ (ilmanvaihto): {Math.round(data.hubCo2)} ppm
          </p>
        )}
      </section>
    </div>
  );
}
