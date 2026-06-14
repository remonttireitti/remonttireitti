import { HEAT_PUMP_MARKETING } from "@/constants/heat-pumps";
import {
  REFRIGERANT_LICENSE_LABELS,
  WORK_CAPABILITY_LABELS,
  type RefrigerantLicense,
  type WorkCapability,
} from "@/types/contractor";

export function formatPumpTypes(
  slugs: string[],
): string {
  if (slugs.length === 0) return "—";
  return slugs
    .map((s) => HEAT_PUMP_MARKETING[s as keyof typeof HEAT_PUMP_MARKETING]?.title ?? s)
    .join(", ");
}

export function formatRefrigerant(license: RefrigerantLicense | null): string {
  if (!license) return "—";
  return REFRIGERANT_LICENSE_LABELS[license];
}

export function formatTrades(names: string[]): string {
  if (names.length === 0) return "—";
  return names.join(", ");
}

export function formatCapability(cap: WorkCapability | null): string {
  if (!cap) return "—";
  return WORK_CAPABILITY_LABELS[cap];
}
