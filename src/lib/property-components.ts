import type { SupabaseClient } from "@supabase/supabase-js";

export type PropertyComponentKind =
  | "katto"
  | "ikkunat"
  | "ovet"
  | "julkisivu"
  | "parveke"
  | "putkisto"
  | "sahko"
  | "lattiat"
  | "eristeet"
  | "pohjarakenne"
  | "valiseinat"
  | "muu";

export const PROPERTY_COMPONENT_KIND_LABELS: Record<
  PropertyComponentKind,
  string
> = {
  katto: "Katto / kate",
  ikkunat: "Ikkunat",
  ovet: "Ovet",
  julkisivu: "Julkisivu / verhous",
  parveke: "Parveke / terassi",
  putkisto: "Putkisto / LVI",
  sahko: "Sähköjärjestelmä",
  lattiat: "Lattiat",
  eristeet: "Eristeet",
  pohjarakenne: "Pohjarakenne / perustukset",
  valiseinat: "Väliseinät",
  muu: "Muu rakennusosa",
};

export const PROPERTY_COMPONENT_KINDS = Object.keys(
  PROPERTY_COMPONENT_KIND_LABELS,
) as PropertyComponentKind[];

export type PropertyComponentRow = {
  id: string;
  property_id: string;
  kind: PropertyComponentKind;
  name: string;
  is_original: boolean | null;
  renewed_at: string | null;
  material: string | null;
  manufacturer: string | null;
  notes: string | null;
  created_at: string;
};

const COMPONENT_SELECT = `
  id,
  property_id,
  kind,
  name,
  is_original,
  renewed_at,
  material,
  manufacturer,
  notes,
  created_at
` as const;

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

function parseOriginality(value: string): boolean | null {
  if (value === "yes") return true;
  if (value === "no") return false;
  return null;
}

export function parsePropertyComponentFormData(formData: FormData) {
  return {
    kind:
      parseEnum(
        String(formData.get("kind") ?? ""),
        PROPERTY_COMPONENT_KINDS,
      ) ?? "muu",
    name: String(formData.get("name") ?? "").trim(),
    isOriginal: parseOriginality(String(formData.get("is_original") ?? "")),
    renewedAt: parseOptionalDate(String(formData.get("renewed_at") ?? "")),
    material: String(formData.get("material") ?? "").trim() || null,
    manufacturer: String(formData.get("manufacturer") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
  };
}

export function validatePropertyComponentForm(input: {
  name: string;
  renewedAt: string | null;
}): string | null {
  if (input.name.length < 2) {
    return "Anna osalle tunnistettava nimi (väh. 2 merkkiä).";
  }
  if (input.renewedAt && Number.isNaN(new Date(input.renewedAt).getTime())) {
    return "Uusimispäivä on virheellinen.";
  }
  return null;
}

export function componentPayload(
  input: ReturnType<typeof parsePropertyComponentFormData>,
) {
  return {
    kind: input.kind,
    name: input.name,
    is_original: input.isOriginal,
    renewed_at: input.isOriginal === false ? input.renewedAt : null,
    material: input.material,
    manufacturer: input.manufacturer,
    notes: input.notes,
  };
}

export function formatPropertyComponentDate(isoDate: string | null): string | null {
  if (!isoDate) return null;
  return new Date(isoDate).toLocaleDateString("fi-FI", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function originalityLabel(isOriginal: boolean | null): string {
  if (isOriginal === true) return "Alkuperäinen";
  if (isOriginal === false) return "Uusittu";
  return "En tiedä";
}

export async function fetchPropertyComponents(
  supabase: SupabaseClient,
  propertyId: string,
  customerId: string,
): Promise<PropertyComponentRow[]> {
  const { data } = await supabase
    .from("property_components")
    .select(COMPONENT_SELECT)
    .eq("property_id", propertyId)
    .eq("customer_id", customerId)
    .order("kind")
    .order("name");

  return (data ?? []) as PropertyComponentRow[];
}

export function buildComponentDetailLines(
  component: PropertyComponentRow,
): { label: string; value: string }[] {
  const lines: { label: string; value: string }[] = [];

  lines.push({ label: "Alkuperäisyys", value: originalityLabel(component.is_original) });

  if (component.is_original === false && component.renewed_at) {
    const d = formatPropertyComponentDate(component.renewed_at);
    if (d) lines.push({ label: "Uusittu", value: d });
  }
  if (component.material) {
    lines.push({ label: "Materiaali / tyyppi", value: component.material });
  }
  if (component.manufacturer) {
    lines.push({ label: "Valmistaja / urakoitsija", value: component.manufacturer });
  }
  if (component.notes) {
    lines.push({ label: "Muistiinpanot", value: component.notes });
  }

  return lines;
}
