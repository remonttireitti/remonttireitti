"use client";

import { useActionState, useEffect, useState } from "react";
import {
  deletePropertyDevice,
  savePropertyDevice,
  type PropertyDeviceActionState,
} from "@/app/actions/property-devices";
import { brand, formInputClass } from "@/lib/brand-theme";
import {
  buildDeviceDetailLines,
  formatPropertyDeviceDate,
  getWarrantyStatus,
  PROPERTY_DEVICE_CATEGORY_GROUPS,
  PROPERTY_DEVICE_CATEGORY_LABELS,
  WARRANTY_STATUS_LABELS,
  type PropertyDeviceRow,
} from "@/lib/property-devices";
import type { PropertyDeviceFileView } from "@/lib/property-device-files";
import { PropertyDeviceFilesPanel } from "@/components/property/property-device-files-panel";

const fieldsetClass =
  "space-y-4 rounded-xl border border-stone-200 bg-stone-50/50 p-4 sm:p-5";
const labelClass = "block text-sm font-medium text-stone-800";
const hintClass = "mt-1 text-xs text-stone-500";

function warrantyBadgeClass(status: ReturnType<typeof getWarrantyStatus>): string {
  switch (status) {
    case "active":
      return "bg-emerald-100 text-emerald-800";
    case "expiring":
      return "bg-amber-100 text-amber-900";
    case "expired":
      return "bg-stone-200 text-stone-600";
    default:
      return "";
  }
}

function DeviceForm({
  propertyId,
  device,
  onCancel,
  onSaved,
}: {
  propertyId: string;
  device?: PropertyDeviceRow;
  onCancel?: () => void;
  onSaved?: () => void;
}) {
  const [state, action, pending] = useActionState<
    PropertyDeviceActionState,
    FormData
  >(savePropertyDevice, {});

  useEffect(() => {
    if (state.ok) onSaved?.();
  }, [state.ok, onSaved]);

  return (
    <form action={action} className={fieldsetClass}>
      <input type="hidden" name="property_id" value={propertyId} />
      {device && <input type="hidden" name="device_id" value={device.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor={device ? `name-${device.id}` : "name-new"} className={labelClass}>
            Nimi / kuvaus *
          </label>
          <input
            id={device ? `name-${device.id}` : "name-new"}
            name="name"
            type="text"
            required
            minLength={2}
            maxLength={120}
            defaultValue={device?.name ?? ""}
            placeholder="Esim. Keittiön jääkaappi, LTO-yksikkö"
            className={formInputClass}
          />
        </div>

        <div>
          <label htmlFor={device ? `cat-${device.id}` : "cat-new"} className={labelClass}>
            Laitetyyppi
          </label>
          <select
            id={device ? `cat-${device.id}` : "cat-new"}
            name="category"
            defaultValue={device?.category ?? "muu"}
            className={formInputClass}
          >
            {PROPERTY_DEVICE_CATEGORY_GROUPS.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {PROPERTY_DEVICE_CATEGORY_LABELS[cat]}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor={device ? `loc-${device.id}` : "loc-new"} className={labelClass}>
            Sijainti
          </label>
          <input
            id={device ? `loc-${device.id}` : "loc-new"}
            name="location"
            type="text"
            defaultValue={device?.location ?? ""}
            placeholder="Esim. autotalli, makuuhuone"
            className={formInputClass}
          />
        </div>

        <div>
          <label htmlFor={device ? `mfr-${device.id}` : "mfr-new"} className={labelClass}>
            Valmistaja
          </label>
          <input
            id={device ? `mfr-${device.id}` : "mfr-new"}
            name="manufacturer"
            type="text"
            defaultValue={device?.manufacturer ?? ""}
            placeholder="Esim. Mitsubishi, Samsung"
            className={formInputClass}
          />
        </div>

        <div>
          <label htmlFor={device ? `model-${device.id}` : "model-new"} className={labelClass}>
            Malli
          </label>
          <input
            id={device ? `model-${device.id}` : "model-new"}
            name="model"
            type="text"
            defaultValue={device?.model ?? ""}
            className={formInputClass}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor={device ? `serial-${device.id}` : "serial-new"} className={labelClass}>
            Sarjanumero
          </label>
          <input
            id={device ? `serial-${device.id}` : "serial-new"}
            name="serial_number"
            type="text"
            defaultValue={device?.serial_number ?? ""}
            className={formInputClass}
          />
        </div>

        <div>
          <label htmlFor={device ? `buy-${device.id}` : "buy-new"} className={labelClass}>
            Hankittu
          </label>
          <input
            id={device ? `buy-${device.id}` : "buy-new"}
            name="purchased_at"
            type="date"
            defaultValue={device?.purchased_at ?? ""}
            className={formInputClass}
          />
        </div>

        <div>
          <label htmlFor={device ? `inst-${device.id}` : "inst-new"} className={labelClass}>
            Asennettu
          </label>
          <input
            id={device ? `inst-${device.id}` : "inst-new"}
            name="installed_at"
            type="date"
            defaultValue={device?.installed_at ?? ""}
            className={formInputClass}
          />
        </div>

        <div>
          <label htmlFor={device ? `warr-${device.id}` : "warr-new"} className={labelClass}>
            Takuu päättyy
          </label>
          <input
            id={device ? `warr-${device.id}` : "warr-new"}
            name="warranty_until"
            type="date"
            defaultValue={device?.warranty_until ?? ""}
            className={formInputClass}
          />
          <p className={hintClass}>Muistutus näkyy huoltokirjassa ennen päättymistä.</p>
        </div>

        <div className="sm:col-span-2">
          <label htmlFor={device ? `notes-${device.id}` : "notes-new"} className={labelClass}>
            Muistiinpanot
          </label>
          <textarea
            id={device ? `notes-${device.id}` : "notes-new"}
            name="notes"
            rows={2}
            defaultValue={device?.notes ?? ""}
            placeholder="Esim. takuuhuollot, asentaja, huomiot"
            className={formInputClass}
          />
        </div>
      </div>

      {state.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="text-sm text-emerald-700" role="status">
          {state.ok}
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="submit"
          disabled={pending}
          className={`${brand.btnPrimary} sm:w-auto`}
        >
          {pending ? "Tallennetaan…" : device ? "Tallenna muutokset" : "Lisää laite"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className={`${brand.btnSecondary} sm:w-auto`}
          >
            Peruuta
          </button>
        )}
      </div>
    </form>
  );
}

function DeviceCard({
  propertyId,
  device,
  files,
}: {
  propertyId: string;
  device: PropertyDeviceRow;
  files: PropertyDeviceFileView[];
}) {
  const [editing, setEditing] = useState(false);
  const [deleteState, deleteAction, deletePending] = useActionState<
    PropertyDeviceActionState,
    FormData
  >(deletePropertyDevice, {});

  const warrantyStatus = getWarrantyStatus(device.warranty_until);
  const detailLines = buildDeviceDetailLines(device);

  if (editing) {
    return (
      <li className="px-5 py-4 sm:px-6">
        <DeviceForm
          propertyId={propertyId}
          device={device}
          onCancel={() => setEditing(false)}
          onSaved={() => setEditing(false)}
        />
      </li>
    );
  }

  return (
    <li className="px-5 py-4 sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-stone-900">{device.name}</p>
            <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-900">
              {PROPERTY_DEVICE_CATEGORY_LABELS[device.category]}
            </span>
            {warrantyStatus !== "none" && (
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${warrantyBadgeClass(warrantyStatus)}`}
              >
                {WARRANTY_STATUS_LABELS[warrantyStatus]}
                {device.warranty_until && (
                  <> · {formatPropertyDeviceDate(device.warranty_until)}</>
                )}
              </span>
            )}
          </div>

          {detailLines.length > 0 && (
            <dl className="mt-3 grid gap-2 sm:grid-cols-2">
              {detailLines.map((line) => (
                <div key={line.label}>
                  <dt className="text-xs font-medium text-stone-500">{line.label}</dt>
                  <dd className="text-sm text-stone-800">{line.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            Muokkaa
          </button>
          <form action={deleteAction}>
            <input type="hidden" name="property_id" value={propertyId} />
            <input type="hidden" name="device_id" value={device.id} />
            <button
              type="submit"
              disabled={deletePending}
              onClick={(e) => {
                if (
                  !confirm(`Poistetaanko laite "${device.name}"?`)
                ) {
                  e.preventDefault();
                }
              }}
              className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
            >
              Poista
            </button>
          </form>
        </div>
      </div>

      <PropertyDeviceFilesPanel
        propertyId={propertyId}
        deviceId={device.id}
        files={files}
      />

      {deleteState.error && (
        <p className="mt-2 text-sm text-red-600">{deleteState.error}</p>
      )}
    </li>
  );
}

export function PropertyDevicesSection({
  propertyId,
  devices,
  filesByDevice,
}: {
  propertyId: string;
  devices: PropertyDeviceRow[];
  filesByDevice: Record<string, PropertyDeviceFileView[]>;
}) {
  const [showAdd, setShowAdd] = useState(false);

  return (
    <section className="mt-8">
      <div className={brand.pageHeaderRow}>
        <div>
          <h2 className="text-lg font-semibold text-stone-900">Laiterekisteri</h2>
          <p className="mt-1 text-sm text-stone-600">
            LTO, lämpöpumput, kodinkoneet ja muut laitteet — hankinta, takuu,
            kuitit ja käyttöohjeet.
          </p>
        </div>
        {!showAdd && (
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className={`${brand.btnPrimary} ${brand.btnPrimaryBlock}`}
          >
            Lisää laite
          </button>
        )}
      </div>

      {showAdd && (
        <div className={`${brand.section} mt-4 p-5 sm:p-6`}>
          <h3 className="text-sm font-semibold text-stone-900">Uusi laite</h3>
          <div className="mt-4">
            <DeviceForm
              propertyId={propertyId}
              onCancel={() => setShowAdd(false)}
              onSaved={() => setShowAdd(false)}
            />
          </div>
        </div>
      )}

      {devices.length === 0 && !showAdd ? (
        <p className={`${brand.section} mt-3 px-5 py-8 text-sm text-stone-600`}>
          Ei vielä laitteita. Lisää esimerkiksi LTO-yksikkö, lämpöpumppu, jääkaappi
          tai grilli — muistat takuut ja mallit myöhemmin huoltopyynnöissä.
        </p>
      ) : (
        devices.length > 0 && (
          <ul className={`${brand.section} mt-3 divide-y divide-stone-100`}>
            {devices.map((device) => (
              <DeviceCard
                key={device.id}
                propertyId={propertyId}
                device={device}
                files={filesByDevice[device.id] ?? []}
              />
            ))}
          </ul>
        )
      )}
    </section>
  );
}
