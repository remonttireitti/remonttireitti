"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useRef, useState, useTransition } from "react";
import { saveFloorPlanPins } from "@/app/actions/floor-plan";
import { FloorPlanPinIconView } from "@/components/floor-plan-pin-icons";
import { anchorToStyle, FLOOR_PLAN_IMAGE } from "@/lib/floor-plan";
import {
  clampPinCoord,
  FLOOR_PLAN_ACTION_TYPES,
  FLOOR_PLAN_PIN_ICONS,
  type FloorPlanDeviceSnapshot,
  type FloorPlanPin,
  type FloorPlanPinAction,
  type FloorPlanPinIcon,
} from "@/lib/floor-plan-pins";

type Props = {
  initialPins: FloorPlanPin[];
  devices: FloorPlanDeviceSnapshot[];
};

export function FloorPlanEditor({ initialPins, devices }: Props) {
  const [pins, setPins] = useState<FloorPlanPin[]>(initialPins);
  const [selectedId, setSelectedId] = useState<string | null>(initialPins[0]?.id ?? null);
  const [placing, setPlacing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const mapRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; pointerId: number } | null>(null);

  const selected = pins.find((p) => p.id === selectedId) ?? null;

  const updatePin = useCallback((id: string, patch: Partial<FloorPlanPin>) => {
    setPins((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }, []);

  const removePin = useCallback((id: string) => {
    setPins((prev) => prev.filter((p) => p.id !== id));
    setSelectedId((cur) => (cur === id ? null : cur));
  }, []);

  function coordsFromEvent(clientX: number, clientY: number) {
    const rect = mapRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      left: clampPinCoord(((clientX - rect.left) / rect.width) * 100),
      top: clampPinCoord(((clientY - rect.top) / rect.height) * 100),
    };
  }

  function addPin(left: number, top: number) {
    const pin: FloorPlanPin = {
      id: crypto.randomUUID(),
      label: "Uusi piste",
      left,
      top,
      icon: "bulb",
      action: { type: "none" },
      showValue: true,
    };
    setPins((prev) => [...prev, pin]);
    setSelectedId(pin.id);
    setPlacing(false);
  }

  function onMapPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (dragRef.current) return;
    if ((e.target as HTMLElement).closest("[data-floor-pin]")) return;
    if (!placing) return;
    const pos = coordsFromEvent(e.clientX, e.clientY);
    if (pos) addPin(pos.left, pos.top);
  }

  function onPinPointerDown(e: React.PointerEvent<HTMLButtonElement>, id: string) {
    e.stopPropagation();
    setSelectedId(id);
    dragRef.current = { id, pointerId: e.pointerId };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPinPointerMove(e: React.PointerEvent<HTMLButtonElement>, id: string) {
    if (!dragRef.current || dragRef.current.id !== id) return;
    const pos = coordsFromEvent(e.clientX, e.clientY);
    if (pos) updatePin(id, pos);
  }

  function onPinPointerUp(e: React.PointerEvent<HTMLButtonElement>) {
    if (dragRef.current?.pointerId === e.pointerId) {
      dragRef.current = null;
    }
    e.currentTarget.releasePointerCapture(e.pointerId);
  }

  function save() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await saveFloorPlanPins(pins);
      if (result.error) setError(result.error);
      else setMessage(result.ok ?? "Tallennettu.");
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Pohjakuva</h1>
          <p className="mt-1 text-sm text-stone-500">
            Lisää pisteitä, valitse ikoni ja entiteetti. Vedä pisteitä paikalleen.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setPlacing((v) => !v)}
            className={`rounded-lg px-3 py-2 text-sm font-medium ${
              placing
                ? "bg-amber-500 text-white"
                : "border border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
            }`}
          >
            {placing ? "Klikkaa karttaa…" : "Lisää piste"}
          </button>
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-60"
          >
            {pending ? "Tallennetaan…" : "Tallenna"}
          </button>
          <Link
            href="/"
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            Kotinäkymä
          </Link>
        </div>
      </div>

      {message && <p className="text-sm text-emerald-700">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="overflow-hidden rounded-2xl border border-stone-200 bg-stone-100 shadow-sm">
          <div
            ref={mapRef}
            className={`relative aspect-[4/3] w-full min-h-[280px] bg-stone-200 sm:min-h-[420px] ${
              placing ? "cursor-crosshair" : ""
            }`}
            onPointerDown={onMapPointerDown}
          >
            <Image
              src={FLOOR_PLAN_IMAGE}
              alt="Pohjapiirros"
              fill
              className="pointer-events-none object-contain"
              sizes="(max-width: 1024px) 100vw, 720px"
            />

            {pins.map((pin) => {
              const pos = anchorToStyle(pin);
              const isSelected = pin.id === selectedId;
              return (
                <button
                  key={pin.id}
                  type="button"
                  data-floor-pin
                  title={pin.label}
                  onPointerDown={(e) => onPinPointerDown(e, pin.id)}
                  onPointerMove={(e) => onPinPointerMove(e, pin.id)}
                  onPointerUp={onPinPointerUp}
                  onPointerCancel={onPinPointerUp}
                  className={`absolute z-10 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 shadow-md touch-none select-none sm:h-10 sm:w-10 ${
                    pin.hidden ? "opacity-40" : ""
                  } ${
                    isSelected
                      ? "border-amber-500 bg-amber-100 text-amber-700 ring-2 ring-amber-300"
                      : "border-stone-300 bg-white/95 text-stone-600"
                  }`}
                  style={pos}
                >
                  <FloorPlanPinIconView icon={pin.icon} />
                </button>
              );
            })}
          </div>
          <p className="border-t border-stone-200 bg-white px-4 py-2 text-xs text-stone-500">
            Valitse piste ja muokkaa oikealta · vedä siirtääksesi · tallenna muutokset
          </p>
        </section>

        <aside className="space-y-4">
          <PinList
            pins={pins}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onRemove={removePin}
          />

          {selected ? (
            <PinForm
              pin={selected}
              devices={devices}
              onChange={(patch) => updatePin(selected.id, patch)}
              onRemove={() => removePin(selected.id)}
            />
          ) : (
            <p className="rounded-xl border border-dashed border-stone-300 bg-stone-50 px-4 py-6 text-sm text-stone-500">
              Valitse piste listasta tai lisää uusi kartalta.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}

function PinList({
  pins,
  selectedId,
  onSelect,
  onRemove,
}: {
  pins: FloorPlanPin[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white">
      <p className="border-b border-stone-100 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-stone-400">
        Pisteet ({pins.length})
      </p>
      <ul className="max-h-48 overflow-y-auto">
        {pins.length === 0 && (
          <li className="px-3 py-4 text-sm text-stone-500">Ei pisteitä vielä.</li>
        )}
        {pins.map((pin) => (
          <li key={pin.id}>
            <div
              className={`flex items-center gap-2 border-b border-stone-50 px-2 py-1.5 ${
                pin.id === selectedId ? "bg-amber-50" : ""
              }`}
            >
              <button
                type="button"
                onClick={() => onSelect(pin.id)}
                className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm text-stone-800"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-600">
                  <FloorPlanPinIconView icon={pin.icon} className="h-4 w-4" />
                </span>
                <span className="truncate">{pin.label}</span>
              </button>
              <button
                type="button"
                onClick={() => onRemove(pin.id)}
                className="shrink-0 rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                aria-label="Poista"
              >
                Poista
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PinForm({
  pin,
  devices,
  onChange,
  onRemove,
}: {
  pin: FloorPlanPin;
  devices: FloorPlanDeviceSnapshot[];
  onChange: (patch: Partial<FloorPlanPin>) => void;
  onRemove: () => void;
}) {
  const actionType = pin.action.type;
  const toggleDeviceId = pin.action.type === "toggle" ? pin.action.deviceId : "";
  const linkHref =
    pin.action.type === "navigate" || pin.action.type === "open_link" ? pin.action.href : "";

  function setAction(action: FloorPlanPinAction) {
    onChange({ action });
  }

  return (
    <div className="space-y-3 rounded-xl border border-stone-200 bg-white p-4">
      <p className="text-sm font-semibold text-stone-900">Pisteen asetukset</p>

      <label className="block text-xs font-medium text-stone-600">
        Nimi
        <input
          value={pin.label}
          onChange={(e) => onChange({ label: e.target.value })}
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
        />
      </label>

      <div className="grid grid-cols-2 gap-2">
        <label className="block text-xs font-medium text-stone-600">
          Vasen %
          <input
            type="number"
            min={0}
            max={100}
            step={0.5}
            value={pin.left}
            onChange={(e) => onChange({ left: clampPinCoord(Number(e.target.value)) })}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-xs font-medium text-stone-600">
          Ylä %
          <input
            type="number"
            min={0}
            max={100}
            step={0.5}
            value={pin.top}
            onChange={(e) => onChange({ top: clampPinCoord(Number(e.target.value)) })}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
        </label>
      </div>

      <label className="block text-xs font-medium text-stone-600">
        Ikoni
        <select
          value={pin.icon}
          onChange={(e) => onChange({ icon: e.target.value as FloorPlanPinIcon })}
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
        >
          {FLOOR_PLAN_PIN_ICONS.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-xs font-medium text-stone-600">
        Toiminto
        <select
          value={actionType}
          onChange={(e) => {
            const type = e.target.value as FloorPlanPinAction["type"];
            if (type === "toggle") setAction({ type: "toggle", deviceId: devices[0]?.id ?? "" });
            else if (type === "navigate") setAction({ type: "navigate", href: "/" });
            else if (type === "open_link") setAction({ type: "open_link", href: "https://" });
            else setAction({ type: "none" });
          }}
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
        >
          {FLOOR_PLAN_ACTION_TYPES.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      {actionType === "toggle" && (
        <label className="block text-xs font-medium text-stone-600">
          Entiteetti (laite)
          <select
            value={toggleDeviceId}
            onChange={(e) => setAction({ type: "toggle", deviceId: e.target.value })}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
          >
            <option value="">— valitse —</option>
            {devices.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.id})
              </option>
            ))}
          </select>
        </label>
      )}

      {(actionType === "navigate" || actionType === "open_link") && (
        <label className="block text-xs font-medium text-stone-600">
          {actionType === "navigate" ? "Sivun polku" : "URL"}
          <input
            value={linkHref}
            onChange={(e) =>
              setAction(
                actionType === "navigate"
                  ? { type: "navigate", href: e.target.value }
                  : { type: "open_link", href: e.target.value },
              )
            }
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            placeholder={actionType === "navigate" ? "/valot" : "https://…"}
          />
        </label>
      )}

      <label className="block text-xs font-medium text-stone-600">
        Arvolähde (näyttö)
        <select
          value={pin.deviceId ?? ""}
          onChange={(e) => onChange({ deviceId: e.target.value || null })}
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
        >
          <option value="">Sama kuin ohjaus / ei arvoa</option>
          {devices.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-2 text-sm text-stone-700">
        <input
          type="checkbox"
          checked={pin.showValue !== false}
          onChange={(e) => onChange({ showValue: e.target.checked })}
        />
        Näytä arvo tekstinä (ei pelkkä ikoni)
      </label>

      <label className="flex items-center gap-2 text-sm text-stone-700">
        <input
          type="checkbox"
          checked={pin.hidden === true}
          onChange={(e) => onChange({ hidden: e.target.checked })}
        />
        Piilotettu kartalta
      </label>

      <button
        type="button"
        onClick={onRemove}
        className="w-full rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
      >
        Poista piste
      </button>
    </div>
  );
}
