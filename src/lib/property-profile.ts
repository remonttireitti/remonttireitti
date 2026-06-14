export type PropertyBuildingType =
  | "omakotitalo"
  | "paritalo"
  | "rivitalo"
  | "kerrostalo"
  | "mokki"
  | "taloyhtio"
  | "muu";

export type HeatingType =
  | "kaukolampo"
  | "oljy"
  | "sahko"
  | "ilmalampopumppu"
  | "maalampopumppu"
  | "puu"
  | "pelletti"
  | "kaasu"
  | "monilammite"
  | "muu";

export type VentilationType =
  | "painovoima"
  | "koneellinen_poisto"
  | "tasapainotettu"
  | "ltp"
  | "ei"
  | "tuntematon";

export type FireplaceType =
  | "avotakka"
  | "varaava_takka"
  | "pellettitakka"
  | "tulisija"
  | "ei";

export type SaunaHeaterType = "sahko" | "puu" | "ei" | "tuntematon";

export type PropertyDetails = {
  heating?: {
    primary?: HeatingType | null;
    secondary?: HeatingType | null;
    notes?: string | null;
  };
  ventilation?: {
    type?: VentilationType | null;
    notes?: string | null;
  };
  fireplaces?: {
    count?: number | null;
    types?: FireplaceType[];
    notes?: string | null;
  };
  sauna?: {
    has_sauna?: boolean | null;
    heater_type?: SaunaHeaterType | null;
    notes?: string | null;
  };
};

export const PROPERTY_BUILDING_TYPE_LABELS: Record<PropertyBuildingType, string> = {
  omakotitalo: "Omakotitalo",
  paritalo: "Paritalo",
  rivitalo: "Rivitalo",
  kerrostalo: "Kerrostalo",
  mokki: "Mökki / lomakohde",
  taloyhtio: "Taloyhtiö / kiinteistö",
  muu: "Muu",
};

export const HEATING_TYPE_LABELS: Record<HeatingType, string> = {
  kaukolampo: "Kaukolämpö",
  oljy: "Öljylämmitys",
  sahko: "Sähkölämmitys",
  ilmalampopumppu: "Ilmalämpöpumppu",
  maalampopumppu: "Maalämpö / poistoilmalämpöpumppu",
  puu: "Puu / takka",
  pelletti: "Pelletti",
  kaasu: "Kaasu",
  monilammite: "Useita lämmitysmuotoja",
  muu: "Muu",
};

export const VENTILATION_TYPE_LABELS: Record<VentilationType, string> = {
  painovoima: "Painovoimainen ilmanvaihto",
  koneellinen_poisto: "Koneellinen poistoilmanvaihto",
  tasapainotettu: "Tasapainotettu ilmanvaihto",
  ltp: "LTO / lämmöntalteenotto",
  ei: "Ei erillistä ilmanvaihtoa",
  tuntematon: "En tiedä / tuntematon",
};

export const FIREPLACE_TYPE_LABELS: Record<FireplaceType, string> = {
  avotakka: "Avotakka / takka",
  varaava_takka: "Varaava takka / uuni",
  pellettitakka: "Pellettitakka / -kattila",
  tulisija: "Tulisija / leivinuuni",
  ei: "Ei tulisijaa",
};

export const SAUNA_HEATER_LABELS: Record<SaunaHeaterType, string> = {
  sahko: "Sähkökiuas",
  puu: "Puukiuka",
  ei: "Ei saunaa",
  tuntematon: "En tiedä",
};

export const PROPERTY_BUILDING_TYPES = Object.keys(
  PROPERTY_BUILDING_TYPE_LABELS,
) as PropertyBuildingType[];

export const HEATING_TYPES = Object.keys(HEATING_TYPE_LABELS) as HeatingType[];
export const VENTILATION_TYPES = Object.keys(
  VENTILATION_TYPE_LABELS,
) as VentilationType[];
export const FIREPLACE_TYPES = Object.keys(
  FIREPLACE_TYPE_LABELS,
) as FireplaceType[];
export const SAUNA_HEATER_TYPES = Object.keys(
  SAUNA_HEATER_LABELS,
) as SaunaHeaterType[];

export type PropertyProfile = {
  id: string;
  label: string | null;
  address_line: string;
  postal_code: string;
  municipality: string;
  property_type: PropertyBuildingType | null;
  built_year: number | null;
  floor_area_m2: number | null;
  notes: string | null;
  details: PropertyDetails;
};

export function emptyPropertyDetails(): PropertyDetails {
  return {};
}

export function parsePropertyDetails(raw: unknown): PropertyDetails {
  if (!raw || typeof raw !== "object") return emptyPropertyDetails();
  const o = raw as Record<string, unknown>;
  const heating = o.heating as PropertyDetails["heating"] | undefined;
  const ventilation = o.ventilation as PropertyDetails["ventilation"] | undefined;
  const fireplaces = o.fireplaces as PropertyDetails["fireplaces"] | undefined;
  const sauna = o.sauna as PropertyDetails["sauna"] | undefined;
  return {
    heating: heating ?? undefined,
    ventilation: ventilation ?? undefined,
    fireplaces: fireplaces ?? undefined,
    sauna: sauna ?? undefined,
  };
}

function parseEnum<T extends string>(
  value: string | null | undefined,
  allowed: readonly T[],
): T | null {
  const v = (value ?? "").trim() as T;
  return allowed.includes(v) ? v : null;
}

export function parsePropertyFormData(formData: FormData): {
  label: string;
  addressLine: string;
  postalCode: string;
  municipality: string;
  propertyType: PropertyBuildingType | null;
  builtYear: number | null;
  floorAreaM2: number | null;
  notes: string;
  details: PropertyDetails;
} {
  const fireplaceTypes = formData
    .getAll("fireplace_types")
    .map((v) => String(v))
    .filter((v): v is FireplaceType =>
      (FIREPLACE_TYPES as readonly string[]).includes(v),
    );

  const fireplaceCountRaw = String(formData.get("fireplace_count") ?? "").trim();
  const fireplaceCount = fireplaceCountRaw
    ? Math.max(0, Math.min(20, Number.parseInt(fireplaceCountRaw, 10)))
    : null;

  const builtYearRaw = String(formData.get("built_year") ?? "").trim();
  const builtYear = builtYearRaw
    ? Number.parseInt(builtYearRaw, 10)
    : null;

  const floorAreaRaw = String(formData.get("floor_area_m2") ?? "").trim();
  const floorAreaM2 = floorAreaRaw
    ? Number.parseFloat(floorAreaRaw.replace(",", "."))
    : null;

  const hasSauna = formData.get("has_sauna") === "yes";

  return {
    label: String(formData.get("label") ?? "").trim(),
    addressLine: String(formData.get("address_line") ?? "").trim(),
    postalCode: String(formData.get("postal_code") ?? "").trim(),
    municipality: String(formData.get("municipality") ?? "").trim(),
    propertyType: parseEnum(
      String(formData.get("property_type") ?? ""),
      PROPERTY_BUILDING_TYPES,
    ),
    builtYear: Number.isFinite(builtYear) ? builtYear : null,
    floorAreaM2: Number.isFinite(floorAreaM2) ? floorAreaM2 : null,
    notes: String(formData.get("notes") ?? "").trim(),
    details: {
      heating: {
        primary: parseEnum(
          String(formData.get("heating_primary") ?? ""),
          HEATING_TYPES,
        ),
        secondary: parseEnum(
          String(formData.get("heating_secondary") ?? ""),
          HEATING_TYPES,
        ),
        notes: String(formData.get("heating_notes") ?? "").trim() || null,
      },
      ventilation: {
        type: parseEnum(
          String(formData.get("ventilation_type") ?? ""),
          VENTILATION_TYPES,
        ),
        notes: String(formData.get("ventilation_notes") ?? "").trim() || null,
      },
      fireplaces: {
        count: Number.isFinite(fireplaceCount) ? fireplaceCount : null,
        types: fireplaceTypes.length > 0 ? fireplaceTypes : undefined,
        notes: String(formData.get("fireplace_notes") ?? "").trim() || null,
      },
      sauna: {
        has_sauna: hasSauna,
        heater_type: hasSauna
          ? parseEnum(
              String(formData.get("sauna_heater_type") ?? ""),
              SAUNA_HEATER_TYPES,
            )
          : ("ei" as SaunaHeaterType),
        notes: String(formData.get("sauna_notes") ?? "").trim() || null,
      },
    },
  };
}

export function validatePropertyForm(input: ReturnType<typeof parsePropertyFormData>): string | null {
  if (!input.postalCode || !/^\d{5}$/.test(input.postalCode)) {
    return "Anna kelvollinen postinumero (5 numeroa).";
  }
  if (!input.municipality) return "Anna kunta.";
  if (
    input.builtYear != null &&
    (input.builtYear < 1800 || input.builtYear > new Date().getFullYear() + 2)
  ) {
    return "Tarkista rakennusvuosi.";
  }
  if (input.floorAreaM2 != null && input.floorAreaM2 <= 0) {
    return "Pinta-alan tulee olla positiivinen.";
  }
  return null;
}

export type PropertyDetailLine = { label: string; value: string };

export function buildPropertyDetailLines(
  property: Pick<
    PropertyProfile,
    "property_type" | "built_year" | "floor_area_m2" | "notes" | "details"
  >,
): PropertyDetailLine[] {
  const lines: PropertyDetailLine[] = [];
  const d = property.details;

  if (property.property_type) {
    lines.push({
      label: "Tyyppi",
      value: PROPERTY_BUILDING_TYPE_LABELS[property.property_type],
    });
  }
  if (property.built_year) {
    lines.push({ label: "Rakennusvuosi", value: String(property.built_year) });
  }
  if (property.floor_area_m2) {
    lines.push({
      label: "Pinta-ala",
      value: `${property.floor_area_m2.toLocaleString("fi-FI")} m²`,
    });
  }

  if (d.heating?.primary) {
    let heating = HEATING_TYPE_LABELS[d.heating.primary];
    if (d.heating.secondary) {
      heating += ` + ${HEATING_TYPE_LABELS[d.heating.secondary]}`;
    }
    lines.push({ label: "Lämmitys", value: heating });
  }
  if (d.heating?.notes) {
    lines.push({ label: "Lämmitys, lisätiedot", value: d.heating.notes });
  }

  if (d.ventilation?.type) {
    lines.push({
      label: "Ilmanvaihto",
      value: VENTILATION_TYPE_LABELS[d.ventilation.type],
    });
  }
  if (d.ventilation?.notes) {
    lines.push({ label: "Ilmanvaihto, lisätiedot", value: d.ventilation.notes });
  }

  if (d.fireplaces) {
    const parts: string[] = [];
    if (d.fireplaces.count != null && d.fireplaces.count > 0) {
      parts.push(`${d.fireplaces.count} kpl`);
    }
    if (d.fireplaces.types?.length) {
      parts.push(
        d.fireplaces.types
          .filter((t) => t !== "ei")
          .map((t) => FIREPLACE_TYPE_LABELS[t])
          .join(", "),
      );
    }
    if (parts.length) {
      lines.push({ label: "Tulisijat / takat", value: parts.join(" · ") });
    } else if (d.fireplaces.types?.includes("ei")) {
      lines.push({ label: "Tulisijat", value: "Ei tulisijaa" });
    }
    if (d.fireplaces.notes) {
      lines.push({ label: "Tulisijat, lisätiedot", value: d.fireplaces.notes });
    }
  }

  if (d.sauna) {
    if (d.sauna.has_sauna === false || d.sauna.heater_type === "ei") {
      lines.push({ label: "Sauna", value: "Ei saunaa" });
    } else if (d.sauna.heater_type) {
      lines.push({
        label: "Sauna",
        value: SAUNA_HEATER_LABELS[d.sauna.heater_type],
      });
    }
    if (d.sauna.notes) {
      lines.push({ label: "Sauna, lisätiedot", value: d.sauna.notes });
    }
  }

  if (property.notes) {
    lines.push({ label: "Muistiinpanot", value: property.notes });
  }

  return lines;
}
