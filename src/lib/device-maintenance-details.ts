import {
  DEVICE_CATEGORIES,
  MAINTENANCE_REQUEST_KINDS,
  MAINTENANCE_SYMPTOMS,
  MAINTENANCE_URGENCY_OPTIONS,
  type DeviceCategory,
  type MaintenanceRequestKind,
  type MaintenanceUrgency,
} from "@/constants/maintenance";
import type { DeviceMaintenanceDetails } from "@/types/device-maintenance-details";

export function isDeviceMaintenanceDetails(
  v: unknown,
): v is DeviceMaintenanceDetails {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.request_kind === "string" &&
    typeof o.device_category === "string" &&
    typeof o.issue_description === "string"
  );
}

export function parseDeviceMaintenanceJson(raw: string): DeviceMaintenanceDetails | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isDeviceMaintenanceDetails(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function validateDeviceMaintenanceDetails(
  d: DeviceMaintenanceDetails,
): string | null {
  if (!MAINTENANCE_REQUEST_KINDS.some((k) => k.value === d.request_kind)) {
    return "Valitse pyynnön tyyppi (huolto tai korjaus).";
  }
  if (!DEVICE_CATEGORIES.some((c) => c.value === d.device_category)) {
    return "Valitse laitteen tyyppi.";
  }
  if (d.issue_description.trim().length < 20) {
    return "Kuvaile vika tai huoltotarve vähintään 20 merkillä.";
  }
  if (!MAINTENANCE_URGENCY_OPTIONS.some((u) => u.value === d.urgency)) {
    return "Valitse kiireellisyys.";
  }
  if (d.urgency === "specific_date" && !d.preferred_date?.trim()) {
    return "Valitse toivottu päivä.";
  }
  if (d.unit_still_works === null) {
    return "Kerro toimiiko laite vielä osittain.";
  }
  return null;
}

export function urgencyToSchedule(d: DeviceMaintenanceDetails): {
  flexibility_weeks: number;
  desired_start: string | null;
} {
  const opt = MAINTENANCE_URGENCY_OPTIONS.find((u) => u.value === d.urgency);
  const weeks = opt?.weeks ?? 4;
  return {
    flexibility_weeks: weeks,
    desired_start:
      d.urgency === "specific_date" && d.preferred_date
        ? d.preferred_date
        : null,
  };
}

function labelDevice(cat: DeviceCategory): string {
  return DEVICE_CATEGORIES.find((c) => c.value === cat)?.label ?? cat;
}

function labelKind(kind: MaintenanceRequestKind): string {
  return MAINTENANCE_REQUEST_KINDS.find((k) => k.value === kind)?.label ?? kind;
}

function labelUrgency(u: MaintenanceUrgency): string {
  return MAINTENANCE_URGENCY_OPTIONS.find((o) => o.value === u)?.label ?? u;
}

export function buildDeviceMaintenanceDescription(
  d: DeviceMaintenanceDetails,
): string {
  const lines = [
    `${labelKind(d.request_kind)} — ${labelDevice(d.device_category)}`,
    d.brand_model.trim() ? `Laite: ${d.brand_model.trim()}` : null,
    d.serial_number.trim() ? `Sarjanro: ${d.serial_number.trim()}` : null,
    d.install_year ? `Asennusvuosi: ${d.install_year}` : null,
    `Kiireellisyys: ${labelUrgency(d.urgency)}`,
    d.unit_still_works === true
      ? "Laite toimii osittain."
      : d.unit_still_works === false
        ? "Laite ei toimi / ei lämmitystä."
        : null,
    d.symptoms.length > 0 ? `Oireet: ${d.symptoms.join(", ")}` : null,
    "",
    d.issue_description.trim(),
    d.special_notes.trim() ? `\nLisätiedot: ${d.special_notes.trim()}` : "",
  ];
  return lines.filter(Boolean).join("\n");
}

export function buildMaintenanceTitle(d: DeviceMaintenanceDetails): string {
  const device = labelDevice(d.device_category);
  const kind = labelKind(d.request_kind);
  return `${kind}: ${device}`;
}
