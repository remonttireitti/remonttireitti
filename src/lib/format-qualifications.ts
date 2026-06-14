import { HEAT_PUMP_MARKETING } from "@/constants/heat-pumps";
import {
  ELECTRICAL_QUALIFICATION_OPTIONS,
  LVI_QUALIFICATION_OPTIONS,
  REFRIGERANT_LICENSE_LABELS,
  type ElectricalQualification,
  type LviQualification,
  type RefrigerantLicense,
} from "@/types/contractor";

export function formatPumpTypes(slugs: string[]): string {
  if (slugs.length === 0) return "—";
  return slugs
    .map(
      (s) =>
        HEAT_PUMP_MARKETING[s as keyof typeof HEAT_PUMP_MARKETING]?.title ?? s,
    )
    .join(", ");
}

export function formatRefrigerant(license: RefrigerantLicense | null): string {
  if (!license) return "—";
  return REFRIGERANT_LICENSE_LABELS[license];
}

export function formatElectricalQualification(
  value: ElectricalQualification | null,
): string {
  if (!value) return "—";
  return (
    ELECTRICAL_QUALIFICATION_OPTIONS.find((o) => o.value === value)?.label ??
    value
  );
}

export function formatLviQualifications(values: LviQualification[]): string {
  if (values.length === 0) return "—";
  return values
    .map(
      (v) =>
        LVI_QUALIFICATION_OPTIONS.find((o) => o.value === v)?.label ?? v,
    )
    .join(", ");
}

export function formatTrades(names: string[]): string {
  if (names.length === 0) return "—";
  return names.join(", ");
}
