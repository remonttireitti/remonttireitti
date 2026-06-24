"use client";

import Link from "next/link";
import { useTransition } from "react";
import { updateDeviceOverride } from "@/app/actions/devices";
import { ItemRenameField } from "@/components/item-rename-field";
import { DEVICE_ROLE_OPTIONS, deviceRoleLabel } from "@/lib/device-roles";
import type { DeviceRole } from "@/lib/device-roles";
import { channelItemKey, wifiEmItemKey } from "@/lib/device-item-overrides";
import { kindLabel } from "@/lib/hub-lights";
import { LAITTEET } from "@/lib/laitteet-paths";
import { HOUSE_ROOMS } from "@/lib/rooms";
import type { WifiIntegrationChannelLive, WifiIntegrationHostLive } from "@/lib/wifi-integration-live";

type Props = {
  title: string;
  empty: string;
  live: WifiIntegrationHostLive[];
  hubOnline?: boolean;
  pending: boolean;
  onRemove: (id: string) => void;
  onUpdated: () => void;
  channelStatus: (ch: WifiIntegrationChannelLive) => string;
};

export function WifiIntegrationHostList({
  title,
  empty,
  live,
  hubOnline,
  pending,
  onRemove,
  onUpdated,
  channelStatus,
}: Props) {
  const [, startTransition] = useTransition();

  function saveOverride(deviceId: string, patch: Parameters<typeof updateDeviceOverride>[1]) {
    startTransition(async () => {
      await updateDeviceOverride(deviceId, patch);
      onUpdated();
    });
  }

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-stone-900">{title}</h2>
      <p className="mt-1 text-xs text-stone-500">
        Nimeä releet ja valitse laitetyyppi (valo, kytkin, tuuletin jne.). Kanavan nimi tallentuu laitteen alle —{" "}
        <Link href={LAITTEET.luettelo} className="underline hover:text-stone-700">
          kaikki laitteet
        </Link>
        .
      </p>
      {live.length === 0 ? (
        <p className="mt-3 text-sm text-stone-500">{empty}</p>
      ) : (
        <ul className="mt-4 divide-y divide-stone-100">
          {live.map((dev) => (
            <li key={dev.id} className="py-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <ItemRenameField
                    deviceId={dev.hostOverrideKey}
                    itemKey="host"
                    currentName={dev.name}
                    mode="display"
                    onRenamed={onUpdated}
                  />
                  <p className="mt-0.5 text-xs text-stone-500">
                    {dev.host}
                    {dev.model && ` · ${dev.model}`}
                    {dev.awaitingSync && " · Odottaa synkkiä (~30 s)"}
                    {!dev.reachable && !dev.awaitingSync && hubOnline && " · Ei vastausta"}
                    {!dev.reachable && !dev.awaitingSync && !hubOnline && " · Yellow offline"}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => onRemove(dev.id)}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-800"
                >
                  Poista
                </button>
              </div>
              {dev.channels.length > 0 && (
                <ul className="mt-3 space-y-3">
                  {dev.channels.map((ch) => (
                    <WifiChannelRow
                      key={ch.id}
                      hostOverrideKey={dev.hostOverrideKey}
                      channel={ch}
                      pending={pending}
                      channelStatus={channelStatus(ch)}
                      onSaveRole={(role) =>
                        saveOverride(ch.id, { role: role || null })
                      }
                      onSaveRoom={(room) =>
                        saveOverride(ch.id, { room: room || null })
                      }
                      onRenamed={onUpdated}
                    />
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function WifiChannelRow({
  hostOverrideKey,
  channel,
  pending,
  channelStatus,
  onSaveRole,
  onSaveRoom,
  onRenamed,
}: {
  hostOverrideKey: string;
  channel: WifiIntegrationChannelLive;
  pending: boolean;
  channelStatus: string;
  onSaveRole: (role: DeviceRole | "") => void;
  onSaveRoom: (room: string) => void;
  onRenamed: () => void;
}) {
  return (
    <li className="rounded-xl border border-stone-100 bg-stone-50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ItemRenameField
          deviceId={hostOverrideKey}
          itemKey={channel.isEm ? wifiEmItemKey() : channelItemKey(channel.channel)}
          currentName={channel.name}
          onRenamed={onRenamed}
        />
        <span className="text-sm text-stone-500">{channelStatus}</span>
      </div>
      <p className="mt-1 text-xs text-stone-500">
        Tyyppi: {kindLabel(channel.kind as Parameters<typeof kindLabel>[0])} · Luokka:{" "}
        {deviceRoleLabel(channel.role)}
        {!channel.roleOverride ? " (automaattinen)" : ""}
      </p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <label className="block text-xs">
          <span className="text-stone-600">Laitetyyppi</span>
          <select
            value={channel.roleOverride ?? ""}
            onChange={(e) => onSaveRole(e.target.value as DeviceRole | "")}
            disabled={pending}
            className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-sm"
          >
            <option value="">
              Automaattinen ({deviceRoleLabel(channel.inferredRole)})
            </option>
            {DEVICE_ROLE_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs">
          <span className="text-stone-600">Huone</span>
          <select
            value={channel.room ?? ""}
            onChange={(e) => onSaveRoom(e.target.value)}
            disabled={pending}
            className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-sm"
          >
            <option value="">— Ei huonetta —</option>
            {HOUSE_ROOMS.map((room) => (
              <option key={room.id} value={room.label}>
                {room.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {channel.controllable && (
        <p className="mt-1.5 text-xs text-stone-400">Ohjattavissa Valot-sivulla kun laitetyyppi on Valo tai Kytkin</p>
      )}
    </li>
  );
}
