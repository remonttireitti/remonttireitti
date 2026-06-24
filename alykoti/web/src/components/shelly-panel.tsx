"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  addShellyDevice,
  discoverShellyDevices,
  probeShellyHost,
  removeShellyDevice,
  type DeviceActionState,
} from "@/app/actions/integrations";
import { WifiIntegrationHostList } from "@/components/wifi-integration-host-list";
import type { ShellyDeviceConfig, ShellyDiscoveredDevice } from "@/lib/types";
import type { WifiIntegrationChannelLive, WifiIntegrationHostLive } from "@/lib/wifi-integration-live";

type ShellyResponse = {
  configured: boolean;
  hubOnline?: boolean;
  devices: ShellyDeviceConfig[];
  live?: WifiIntegrationHostLive[];
  discovered?: Array<ShellyDiscoveredDevice & { type_label?: string }>;
};

function formatPower(w?: number | null): string | null {
  if (w == null || !Number.isFinite(w)) return null;
  return `${Math.round(w)} W`;
}

function formatEnergy(wh?: number | null): string | null {
  if (wh == null || !Number.isFinite(wh)) return null;
  if (wh >= 1000) return `${(wh / 1000).toFixed(1)} kWh`;
  return `${Math.round(wh)} Wh`;
}

function channelStatus(ch: WifiIntegrationChannelLive): string {
  if (ch.kind === "sensor") {
    const parts = [
      formatPower(ch.power_w),
      formatEnergy(ch.energy_wh),
      ch.em_a_power_w != null ? `A ${Math.round(ch.em_a_power_w)} W` : null,
      ch.em_b_power_w != null ? `B ${Math.round(ch.em_b_power_w)} W` : null,
    ].filter(Boolean);
    return parts.join(" · ") || "Online";
  }
  return ch.on ? "Päällä" : "Pois";
}

export function ShellyPanel() {
  const [data, setData] = useState<ShellyResponse | null>(null);
  const [flash, setFlash] = useState<DeviceActionState | null>(null);
  const [host, setHost] = useState("");
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();

  const load = useCallback(async () => {
    const res = await fetch("/api/integrations/shelly", { cache: "no-store" });
    setData((await res.json()) as ShellyResponse);
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
          Yellow offline — haku ja synkki vaativat Pi-yhteyden.
        </div>
      )}

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-900">Etsi verkosta</h2>
        <p className="mt-1 text-sm text-stone-600">
          Tunnistaa automaattisesti energiamittarit, monikanavaiset kytkimet (Pro 4) ja yksittäiset releet.
        </p>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            run(async () => {
              const r = await discoverShellyDevices();
              return r.ok ? { ok: "Haku käynnissä — päivitä ~30 s kuluttua." } : r;
            }, false)
          }
          className="mt-4 rounded-xl bg-stone-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Etsi Shellyt
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
                    onClick={() => run(() => addShellyDevice(item.host, item.name, item.gen ?? 2, item.model))}
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
            run(() => addShellyDevice(host, name || host));
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
            onClick={() => run(() => probeShellyHost(host))}
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
        title="Shelly-laitteet"
        empty="Ei laitteita. Lisää energiamittari, Pro 4 -kytkin tai muu Shelly IP:llä."
        live={live}
        hubOnline={data?.hubOnline}
        pending={pending}
        onRemove={(id) => run(() => removeShellyDevice(id))}
        onUpdated={() => void load()}
        channelStatus={channelStatus}
      />
    </div>
  );
}
