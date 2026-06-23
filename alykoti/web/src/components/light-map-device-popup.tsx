"use client";

import Link from "next/link";
import { inferProtocolFromId, protocolLabel, parseZwaveDeviceId, type DeviceProtocol } from "@/lib/device-protocol";
import { LAITTEET } from "@/lib/laitteet-paths";

type Device = {
  id: string;
  name: string;
  on: boolean;
  controllable?: boolean;
  protocol?: string;
  room?: string | null;
  brightness?: number | null;
};

type Props = {
  device: Device;
  onClose: () => void;
  onToggle?: () => void;
};

export function LightMapDevicePopup({ device, onClose, onToggle }: Props) {
  const protocol = inferProtocolFromId(device.id, device.protocol as DeviceProtocol);
  const settingsHref = deviceSettingsHref(device.id, protocol);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4 sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={device.name}
      >
        <h3 className="text-lg font-semibold text-stone-900">{device.name}</h3>
        <p className="mt-1 text-sm text-stone-500">
          {protocolLabel(protocol)}
          {device.room ? ` · ${device.room}` : ""}
        </p>

        <p className="mt-4 text-sm text-stone-700">
          Tila:{" "}
          <span className={`font-semibold ${device.on ? "text-amber-700" : "text-stone-500"}`}>
            {device.on ? "Päällä" : "Pois"}
          </span>
          {device.brightness != null && device.on && (
            <span className="text-stone-500">
              {" "}
              · {Math.round((device.brightness / 254) * 100)} %
            </span>
          )}
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          {device.controllable !== false && onToggle && (
            <button
              type="button"
              onClick={onToggle}
              className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800"
            >
              {device.on ? "Sammuta" : "Sytytä"}
            </button>
          )}
          {settingsHref && (
            <Link
              href={settingsHref}
              className="rounded-xl border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-800 hover:bg-stone-50"
              onClick={onClose}
            >
              Laitteen asetukset
            </Link>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-stone-200 px-4 py-2 text-sm text-stone-600 hover:bg-stone-50"
          >
            Sulje
          </button>
        </div>
      </div>
    </div>
  );
}

function deviceSettingsHref(id: string, protocol: DeviceProtocol): string | null {
  if (protocol === "zigbee") return LAITTEET.zigbeeDevice(id);
  if (protocol === "zwave") {
    const parsed = parseZwaveDeviceId(id);
    if (parsed) return LAITTEET.zwaveDevice(parsed.nodeId);
  }
  return LAITTEET.luettelo;
}
