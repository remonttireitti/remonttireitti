"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  addTasmotaDevice,
  discoverTasmotaDevices,
  probeTasmotaHost,
  removeTasmotaDevice,
  type DeviceActionState,
} from "@/app/actions/integrations";
import { WifiIntegrationHostList } from "@/components/wifi-integration-host-list";
import type { TasmotaDeviceConfig, TasmotaDiscoveredDevice } from "@/lib/types";
import type { WifiIntegrationChannelLive, WifiIntegrationHostLive } from "@/lib/wifi-integration-live";

type TasmotaResponse = {
  configured: boolean;
  hubOnline?: boolean;
  devices: TasmotaDeviceConfig[];
  live?: WifiIntegrationHostLive[];
  discovered?: Array<TasmotaDiscoveredDevice & { type_label?: string; switch_channels?: number }>;
};

function channelStatus(ch: WifiIntegrationChannelLive): string {
  return ch.on ? "Päällä" : "Pois";
}

export function TasmotaPanel() {
  const [data, setData] = useState<TasmotaResponse | null>(null);
  const [flash, setFlash] = useState<DeviceActionState | null>(null);
  const [host, setHost] = useState("");
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();

  const load = useCallback(async () => {
    const res = await fetch("/api/integrations/tasmota", { cache: "no-store" });
    setData((await res.json()) as TasmotaResponse);
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 8_000);
    return () => clearInterval(id);
  }, [load]);

  function run(action: () => Promise<DeviceActionState>, reload = true) {
    startTransition(async () => {
      const result = await action();
      setFlash(result);
      if (result.ok && reload) {
        if (!result.ok.includes("Yellow")) {
          setHost("");
          setName("");
        }
        await load();
      }
    });
  }

  const configuredHosts = new Set((data?.devices ?? []).map((d) => d.host));
  const live = data?.live ?? [];
  const discovered = data?.discovered ?? [];

  return (
    <div className="mt-6 space-y-6">
      {flash?.ok && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-900">{flash.ok}</div>
      )}
      {flash?.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900">{flash.error}</div>
      )}

      {data?.hubOnline === false && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
          Yellow offline — haku vaatii Pi-yhteyden.
        </div>
      )}

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-900">Etsi verkosta</h2>
        <p className="mt-1 text-sm text-stone-600">
          Tunnistaa Tasmota-laitteet ja kaikki relekanavat (esim. 4-kanavainen Sonoff).
        </p>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            run(async () => {
              const r = await discoverTasmotaDevices();
              return r.ok ? { ok: "Haku käynnissä — päivitä ~30 s kuluttua." } : r;
            }, false)
          }
          className="mt-4 rounded-xl bg-stone-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Etsi Tasmota-laitteet
        </button>

        {discovered.length > 0 && (
          <ul className="mt-4 divide-y divide-stone-100">
            {discovered.map((item) => (
              <li key={item.host} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-medium text-stone-900">{item.name}</p>
                  <p className="text-xs text-stone-500">
                    {item.host}
                    {item.model && ` · ${item.model}`}
                    {item.type_label && ` · ${item.type_label}`}
                  </p>
                </div>
                {configuredHosts.has(item.host) ? (
                  <span className="text-xs text-stone-500">Lisätty</span>
                ) : (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => addTasmotaDevice(item.host, item.name, item.model))}
                    className="rounded-lg border border-stone-200 px-3 py-1.5 text-sm hover:bg-stone-50"
                  >
                    Lisää
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-900">Lisää IP:llä</h2>
        <form
          className="mt-4 flex flex-wrap gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => addTasmotaDevice(host, name || host));
          }}
        >
          <input
            type="text"
            placeholder="192.168.50.120"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            className="min-w-[10rem] flex-1 rounded-xl border border-stone-200 px-3 py-2 text-sm"
            required
          />
          <input
            type="text"
            placeholder="Nimi (valinnainen)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="min-w-[10rem] flex-1 rounded-xl border border-stone-200 px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={pending || !host.trim()}
            onClick={() => run(() => probeTasmotaHost(host))}
            className="rounded-xl border border-stone-200 px-4 py-2 text-sm disabled:opacity-50"
          >
            Testaa
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Lisää
          </button>
        </form>
      </section>

      <WifiIntegrationHostList
        title="Tasmota-laitteet"
        empty="Ei laitteita."
        live={live}
        hubOnline={data?.hubOnline}
        pending={pending}
        onRemove={(id) => run(() => removeTasmotaDevice(id))}
        onUpdated={() => void load()}
        channelStatus={channelStatus}
      />
    </div>
  );
}
