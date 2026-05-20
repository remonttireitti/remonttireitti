import {
  DEVICE_CATEGORIES,
  MAINTENANCE_REQUEST_KINDS,
  MAINTENANCE_URGENCY_OPTIONS,
} from "@/constants/maintenance";
import type { DeviceMaintenanceDetails } from "@/types/device-maintenance-details";

export function DeviceMaintenanceDetailsView({
  details,
}: {
  details: DeviceMaintenanceDetails;
}) {
  const device =
    DEVICE_CATEGORIES.find((d) => d.value === details.device_category)?.label ??
    details.device_category;
  const kind =
    MAINTENANCE_REQUEST_KINDS.find((k) => k.value === details.request_kind)
      ?.label ?? details.request_kind;
  const urgency =
    MAINTENANCE_URGENCY_OPTIONS.find((u) => u.value === details.urgency)?.label ??
    details.urgency;

  return (
    <section className="rounded-xl border border-stone-200 bg-white p-5 text-sm">
      <h2 className="font-semibold text-stone-900">Huolto / korjaus</h2>
      <dl className="mt-3 grid gap-2 sm:grid-cols-2">
        <Item label="Pyyntö" value={kind} />
        <Item label="Laite" value={device} />
        {details.brand_model && (
          <Item label="Merkki / malli" value={details.brand_model} />
        )}
        {details.serial_number && (
          <Item label="Sarjanumero" value={details.serial_number} />
        )}
        {details.install_year && (
          <Item label="Asennusvuosi" value={String(details.install_year)} />
        )}
        <Item label="Kiireellisyys" value={urgency} />
        {details.preferred_date && (
          <Item label="Toivottu päivä" value={details.preferred_date} />
        )}
        <Item
          label="Laite toimii"
          value={
            details.unit_still_works === true
              ? "Osittain"
              : details.unit_still_works === false
                ? "Ei"
                : "—"
          }
        />
      </dl>
      {details.symptoms.length > 0 && (
        <p className="mt-3 text-stone-600">
          <span className="font-medium text-stone-800">Oireet: </span>
          {details.symptoms.join(", ")}
        </p>
      )}
      <p className="mt-3 whitespace-pre-wrap text-stone-700">
        {details.issue_description}
      </p>
      {details.special_notes && (
        <p className="mt-2 text-stone-600">
          <span className="font-medium">Lisätiedot: </span>
          {details.special_notes}
        </p>
      )}
    </section>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-stone-500">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
