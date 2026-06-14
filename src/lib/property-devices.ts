import type { SupabaseClient } from "@supabase/supabase-js";

export type PropertyDeviceCategory =
  | "lto"
  | "ilmalampopumppu"
  | "ilmavesilampopumppu"
  | "maalampopumppu"
  | "poistoilmalampopumppu"
  | "ilmastointikone"
  | "jääkaappi"
  | "pakastin"
  | "astianpesukone"
  | "pesukone"
  | "kuivausrumpu"
  | "uuni_liesi"
  | "mikroaaltouuni"
  | "televisio"
  | "grilli"
  | "aurinkopaneelit"
  | "latausasema"
  | "muu";

export const PROPERTY_DEVICE_CATEGORY_LABELS: Record<
  PropertyDeviceCategory,
  string
> = {
  lto: "LTO / lämmöntalteenotto",
  ilmalampopumppu: "Ilmalämpöpumppu",
  ilmavesilampopumppu: "Ilmavesilämpöpumppu",
  maalampopumppu: "Maalämpöpumppu",
  poistoilmalampopumppu: "Poistoilmalämpöpumppu",
  ilmastointikone: "Ilmastointikone / tuuletus",
  jääkaappi: "Jääkaappi",
  pakastin: "Pakastin",
  astianpesukone: "Astianpesukone",
  pesukone: "Pesukone",
  kuivausrumpu: "Kuivausrumpu",
  uuni_liesi: "Uuni / liesi",
  mikroaaltouuni: "Mikroaaltouuni",
  televisio: "Televisio",
  grilli: "Grilli",
  aurinkopaneelit: "Aurinkopaneelit",
  latausasema: "Sähköauton latausasema",
  muu: "Muu laite",
};

export const PROPERTY_DEVICE_CATEGORIES = Object.keys(
  PROPERTY_DEVICE_CATEGORY_LABELS,
) as PropertyDeviceCategory[];

/** Ryhmittely lomakkeen valikkoa varten */
export const PROPERTY_DEVICE_CATEGORY_GROUPS: {
  label: string;
  categories: PropertyDeviceCategory[];
}[] = [
  {
    label: "Lämmitys & ilmanvaihto",
    categories: [
      "lto",
      "ilmalampopumppu",
      "ilmavesilampopumppu",
      "maalampopumppu",
      "poistoilmalampopumppu",
      "ilmastointikone",
    ],
  },
  {
    label: "Kodinkoneet",
    categories: [
      "jääkaappi",
      "pakastin",
      "astianpesukone",
      "pesukone",
      "kuivausrumpu",
      "uuni_liesi",
      "mikroaaltouuni",
    ],
  },
  {
    label: "Muu",
    categories: ["televisio", "grilli", "aurinkopaneelit", "latausasema", "muu"],
  },
];

export type PropertyDeviceRow = {
  id: string;
  property_id: string;
  category: PropertyDeviceCategory;
  name: string;
  manufacturer: string | null;
  model: string | null;
  serial_number: string | null;
  location: string | null;
  purchased_at: string | null;
  installed_at: string | null;
  warranty_until: string | null;
  notes: string | null;
  created_at: string;
};

export type WarrantyStatus = "none" | "active" | "expiring" | "expired";

const DEVICE_SELECT = `
  id,
  property_id,
  category,
  name,
  manufacturer,
  model,
  serial_number,
  location,
  purchased_at,
  installed_at,
  warranty_until,
  notes,
  created_at
` as const;

export function formatPropertyDeviceDate(isoDate: string | null): string | null {
  if (!isoDate) return null;
  return new Date(isoDate).toLocaleDateString("fi-FI", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function getWarrantyStatus(warrantyUntil: string | null): WarrantyStatus {
  if (!warrantyUntil) return "none";
  const end = new Date(warrantyUntil);
  if (Number.isNaN(end.getTime())) return "none";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  const msPerDay = 1000 * 60 * 60 * 24;
  const daysLeft = Math.ceil((end.getTime() - today.getTime()) / msPerDay);

  if (daysLeft < 0) return "expired";
  if (daysLeft <= 60) return "expiring";
  return "active";
}

export const WARRANTY_STATUS_LABELS: Record<
  Exclude<WarrantyStatus, "none">,
  string
> = {
  active: "Takuu voimassa",
  expiring: "Takuu päättymässä",
  expired: "Takuu päättynyt",
};

function parseOptionalDate(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  return v;
}

function parseEnum<T extends string>(
  value: string,
  allowed: readonly T[],
): T | null {
  const v = value.trim() as T;
  return allowed.includes(v) ? v : null;
}

export function parsePropertyDeviceFormData(formData: FormData): {
  category: PropertyDeviceCategory;
  name: string;
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
  location: string | null;
  purchasedAt: string | null;
  installedAt: string | null;
  warrantyUntil: string | null;
  notes: string | null;
} {
  return {
    category:
      parseEnum(
        String(formData.get("category") ?? ""),
        PROPERTY_DEVICE_CATEGORIES,
      ) ?? "muu",
    name: String(formData.get("name") ?? "").trim(),
    manufacturer: String(formData.get("manufacturer") ?? "").trim() || null,
    model: String(formData.get("model") ?? "").trim() || null,
    serialNumber: String(formData.get("serial_number") ?? "").trim() || null,
    location: String(formData.get("location") ?? "").trim() || null,
    purchasedAt: parseOptionalDate(String(formData.get("purchased_at") ?? "")),
    installedAt: parseOptionalDate(String(formData.get("installed_at") ?? "")),
    warrantyUntil: parseOptionalDate(String(formData.get("warranty_until") ?? "")),
    notes: String(formData.get("notes") ?? "").trim() || null,
  };
}

export function validatePropertyDeviceForm(input: {
  name: string;
  purchasedAt: string | null;
  installedAt: string | null;
  warrantyUntil: string | null;
}): string | null {
  if (input.name.length < 2) {
    return "Anna laitteelle tunnistettava nimi (väh. 2 merkkiä).";
  }
  if (input.name.length > 120) {
    return "Nimi on liian pitkä.";
  }
  for (const [label, value] of [
    ["Hankintapäivä", input.purchasedAt],
    ["Asennuspäivä", input.installedAt],
    ["Takuun päättyminen", input.warrantyUntil],
  ] as const) {
    if (value && Number.isNaN(new Date(value).getTime())) {
      return `${label} on virheellinen.`;
    }
  }
  return null;
}

export function devicePayload(input: ReturnType<typeof parsePropertyDeviceFormData>) {
  return {
    category: input.category,
    name: input.name,
    manufacturer: input.manufacturer,
    model: input.model,
    serial_number: input.serialNumber,
    location: input.location,
    purchased_at: input.purchasedAt,
    installed_at: input.installedAt,
    warranty_until: input.warrantyUntil,
    notes: input.notes,
  };
}

export async function fetchPropertyDevices(
  supabase: SupabaseClient,
  propertyId: string,
  customerId: string,
): Promise<PropertyDeviceRow[]> {
  const { data } = await supabase
    .from("property_devices")
    .select(DEVICE_SELECT)
    .eq("property_id", propertyId)
    .eq("customer_id", customerId)
    .order("category")
    .order("name");

  return (data ?? []) as PropertyDeviceRow[];
}

export function buildDeviceDetailLines(device: PropertyDeviceRow): {
  label: string;
  value: string;
}[] {
  const lines: { label: string; value: string }[] = [];

  if (device.manufacturer) {
    lines.push({ label: "Valmistaja", value: device.manufacturer });
  }
  if (device.model) {
    lines.push({ label: "Malli", value: device.model });
  }
  if (device.serial_number) {
    lines.push({ label: "Sarjanumero", value: device.serial_number });
  }
  if (device.location) {
    lines.push({ label: "Sijainti", value: device.location });
  }
  if (device.purchased_at) {
    const d = formatPropertyDeviceDate(device.purchased_at);
    if (d) lines.push({ label: "Hankittu", value: d });
  }
  if (device.installed_at) {
    const d = formatPropertyDeviceDate(device.installed_at);
    if (d) lines.push({ label: "Asennettu", value: d });
  }
  if (device.warranty_until) {
    const d = formatPropertyDeviceDate(device.warranty_until);
    if (d) lines.push({ label: "Takuu päättyy", value: d });
  }
  if (device.notes) {
    lines.push({ label: "Muistiinpanot", value: device.notes });
  }

  return lines;
}
