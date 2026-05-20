/** Huolto- ja korjauspyyntöjen tyypit ja laiteluokat. */

export const MAINTENANCE_JOB_SLUGS = [
  "lampopumppu-huolto",
  "lampopumppu-korjaus",
] as const;

export type MaintenanceJobSlug = (typeof MAINTENANCE_JOB_SLUGS)[number];

export const MAINTENANCE_REQUEST_KINDS = [
  { value: "huolto", label: "Huolto", description: "Säännöllinen huolto tai tarkastus" },
  { value: "korjaus", label: "Korjaus", description: "Vika, häiriö tai laite ei toimi normaalisti" },
] as const;

export type MaintenanceRequestKind = (typeof MAINTENANCE_REQUEST_KINDS)[number]["value"];

export const DEVICE_CATEGORIES = [
  { value: "ilmalampopumppu", label: "Ilmalämpöpumppu", installSlug: "ilmalampopumppu" },
  { value: "ilmavesilampopumppu", label: "Vesi-ilmalämpöpumppu", installSlug: "ilmavesilampopumppu" },
  { value: "maalampopumppu", label: "Maalämpöpumppu", installSlug: "maalampopumppu" },
  { value: "poistoilmalampopumppu", label: "Poistoilmalämpöpumppu", installSlug: "poistoilmalampopumppu" },
  { value: "muu", label: "Muu / en tiedä", installSlug: null },
] as const;

export type DeviceCategory = (typeof DEVICE_CATEGORIES)[number]["value"];

export const MAINTENANCE_SYMPTOMS = [
  "Ei lämmitä",
  "Ei jäähdytä",
  "Outo ääni",
  "Vuoto / kondenssivesi",
  "Virhekoodi näytöllä",
  "Korkea sähkönkulutus",
  "Etäohjaus ei toimi",
] as const;

export const MAINTENANCE_URGENCY_OPTIONS = [
  { value: "asap", label: "Heti / mahdollisimman pian", weeks: 1 },
  { value: "within_week", label: "Viikon sisällä", weeks: 1 },
  { value: "flexible", label: "Joustavasti (2–4 vk)", weeks: 3 },
  { value: "specific_date", label: "Tietty päivä", weeks: 4 },
] as const;

export type MaintenanceUrgency = (typeof MAINTENANCE_URGENCY_OPTIONS)[number]["value"];

export function maintenanceJobSlugForKind(
  kind: MaintenanceRequestKind,
): MaintenanceJobSlug {
  return kind === "huolto" ? "lampopumppu-huolto" : "lampopumppu-korjaus";
}

export function installSlugForDevice(device: DeviceCategory): string | null {
  return DEVICE_CATEGORIES.find((d) => d.value === device)?.installSlug ?? null;
}
