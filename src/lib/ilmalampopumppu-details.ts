import {
  ILP_MAX_SINGLE_UNIT_COVERAGE_M2,
  type IlpCoolingNeed,
} from "@/constants/ilmalampopumppu";
import { CLIMATE_ZONE_LABELS } from "@/constants/climate-zones";
import {
  formatBudgetOfferPreference,
  parseAcceptOffersOverBudget,
} from "@/lib/budget-preferences";
import {
  formatEquipmentSupplyLine,
  parseEquipmentSupply,
} from "@/lib/equipment-supply";
import {
  estimateCoolingPowerKw,
  estimateHeatingPowerKw,
  formatPowerEstimate,
  parseClimateZone,
} from "@/lib/heat-pump-sizing";
import {
  createDefaultUnitInstallations,
  INITIAL_ILP_DETAILS,
  type IlmalampopumppuDetails,
  type IlpMountHeight,
  type IlpUnitInstallation,
} from "@/types/ilmalampopumppu-details";

const LABELS = {
  installation_type: {
    new: "Uusi asennus",
    replacement: "Nykyisen pumpun vaihto",
  },
  usage: {
    cooling_only: "Vain viilennys",
    heating_and_cooling: "Lämmitys ja viilennys",
  },
  quality_tier: {
    budget: "Budjetti / edullinen malli",
    standard: "Perus lämpöpumppu",
    premium: "Paras tekniikka ja suorituskyky",
  },
  system_type: {
    split_1_1: "Yksi sisä- ja yksi ulkoyksikkö",
    multi_split: "Ulkoyksikkö, useita sisäyksiköitä",
  },
  quote_layout: {
    single: "Yksi järjestelmä",
    two_independent_splits: "Kaksi erillistä split-laitetta (yksi tarjouspyyntö)",
  },
  outdoor_mounting: {
    ground: "Maateline",
    wall: "Seinäteline",
    plinth: "Sokkeliteline",
    balcony: "Parveketeline",
  },
  schedule: {
    asap: "Mahdollisimman pian",
    flexible: "Ei kiirettä",
    specific_date: "Toivottu asennuspäivä",
  },
  height: { under_3m: "Alle 3 m", over_3m: "Yli 3 m" },
  cooling_need: {
    light: "Kevyt jäähdytystarve",
    normal: "Normaali jäähdytystarve",
    demanding: "Vaativa jäähdytystarve",
  },
} as const;

function parseCoolingNeed(raw: unknown): IlpCoolingNeed {
  if (raw === "light" || raw === "demanding") return raw;
  return "normal";
}

function parseMountHeight(raw: unknown): IlpMountHeight {
  return raw === "over_3m" ? "over_3m" : "under_3m";
}

function normalizeUnitInstallations(
  raw: unknown,
): IlpUnitInstallation[] {
  const defaults = createDefaultUnitInstallations();
  if (!Array.isArray(raw) || raw.length === 0) return defaults;

  return defaults.map((fallback, index) => {
    const item = raw[index] as Partial<IlpUnitInstallation> | undefined;
    if (!item || typeof item !== "object") return fallback;
    return {
      label: String(item.label ?? fallback.label),
      coverage_area_m2:
        typeof item.coverage_area_m2 === "number"
          ? item.coverage_area_m2
          : null,
      pipe_distance_m:
        typeof item.pipe_distance_m === "number" ? item.pipe_distance_m : null,
      indoor_mount_height: parseMountHeight(item.indoor_mount_height),
      indoor_mount_height_m:
        typeof item.indoor_mount_height_m === "number"
          ? item.indoor_mount_height_m
          : null,
      outdoor_mount_height: parseMountHeight(item.outdoor_mount_height),
      outdoor_mount_height_m:
        typeof item.outdoor_mount_height_m === "number"
          ? item.outdoor_mount_height_m
          : null,
    };
  });
}

function formatHeightLine(
  prefix: string,
  height: IlpMountHeight,
  meters: number | null,
): string {
  return `${prefix}: ${LABELS.height[height]}${
    height === "over_3m" && meters ? ` (${meters} m)` : ""
  }`;
}

export function totalIlpCoverageM2(d: IlmalampopumppuDetails): number {
  if (d.quote_layout === "two_independent_splits") {
    return d.unit_installations.reduce(
      (sum, u) => sum + (u.coverage_area_m2 ?? 0),
      0,
    );
  }
  return d.heated_area_m2;
}

export function ilpNeedsLargeAreaGuidance(d: IlmalampopumppuDetails): boolean {
  if (d.quote_layout === "two_independent_splits") {
    return d.unit_installations.some(
      (u) => (u.coverage_area_m2 ?? 0) > ILP_MAX_SINGLE_UNIT_COVERAGE_M2,
    );
  }
  if (d.system_type === "multi_split") {
    const perUnit = d.heated_area_m2 / Math.max(d.indoor_unit_count, 1);
    return d.heated_area_m2 > ILP_MAX_SINGLE_UNIT_COVERAGE_M2 || perUnit > ILP_MAX_SINGLE_UNIT_COVERAGE_M2;
  }
  return d.heated_area_m2 > ILP_MAX_SINGLE_UNIT_COVERAGE_M2;
}

export function parseIlpDetailsJson(raw: string): IlmalampopumppuDetails | null {
  try {
    const p = JSON.parse(raw) as Partial<IlmalampopumppuDetails>;
    const quoteLayout =
      p.quote_layout === "two_independent_splits"
        ? "two_independent_splits"
        : "single";
    return {
      ...INITIAL_ILP_DETAILS,
      ...p,
      quote_layout: quoteLayout,
      unit_installations: normalizeUnitInstallations(p.unit_installations),
      cooling_need: parseCoolingNeed(p.cooling_need),
      climate_zone: parseClimateZone(p.climate_zone),
      accept_offers_over_budget: parseAcceptOffersOverBudget(p),
      equipment_supply: parseEquipmentSupply(p.equipment_supply),
    };
  } catch {
    return null;
  }
}

export function parseIlpDetailsFromFormData(
  formData: FormData,
): IlmalampopumppuDetails {
  const num = (key: string) => {
    const v = String(formData.get(key) ?? "").trim();
    if (!v) return null;
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
  };

  return {
    installation_type:
      String(formData.get("ilp_installation_type")) === "replacement"
        ? "replacement"
        : "new",
    usage:
      String(formData.get("ilp_usage")) === "cooling_only"
        ? "cooling_only"
        : "heating_and_cooling",
    cooling_need: parseCoolingNeed(formData.get("ilp_cooling_need")),
    quality_tier: (String(formData.get("ilp_quality_tier")) ||
      "standard") as IlmalampopumppuDetails["quality_tier"],
    system_type:
      String(formData.get("ilp_system_type")) === "multi_split"
        ? "multi_split"
        : "split_1_1",
    indoor_unit_count: Math.max(1, num("ilp_indoor_unit_count") ?? 1),
    quote_layout:
      String(formData.get("ilp_quote_layout")) === "two_independent_splits"
        ? "two_independent_splits"
        : "single",
    property_type: String(formData.get("ilp_property_type") ?? "omakotitalo"),
    heated_area_m2: num("ilp_heated_area_m2") ?? 0,
    climate_zone: parseClimateZone(formData.get("ilp_climate_zone")),
    build_year: num("ilp_build_year"),
    pipe_distance_m_per_unit: num("ilp_pipe_distance_m"),
    indoor_mount_height:
      String(formData.get("ilp_indoor_mount_height")) === "over_3m"
        ? "over_3m"
        : "under_3m",
    indoor_mount_height_m: num("ilp_indoor_mount_height_m"),
    outdoor_mount_height:
      String(formData.get("ilp_outdoor_mount_height")) === "over_3m"
        ? "over_3m"
        : "under_3m",
    outdoor_mount_height_m: num("ilp_outdoor_mount_height_m"),
    unit_installations: createDefaultUnitInstallations(),
    exterior_wall_material: String(
      formData.get("ilp_exterior_wall_material") ?? "",
    ),
    outdoor_mounting: (String(formData.get("ilp_outdoor_mounting")) ||
      "ground") as IlmalampopumppuDetails["outdoor_mounting"],
    outdoor_enclosure: formData.get("ilp_outdoor_enclosure") === "yes",
    outdoor_electrical_included:
      formData.get("ilp_outdoor_electrical_included") === "yes",
    schedule: (String(formData.get("ilp_schedule")) ||
      "flexible") as IlmalampopumppuDetails["schedule"],
    installation_date:
      String(formData.get("ilp_installation_date") ?? "").trim() || null,
    budget_max_eur: num("ilp_budget_max_eur"),
    accept_offers_over_budget:
      formData.get("ilp_accept_offers_over_budget") === "yes",
    equipment_supply: parseEquipmentSupply(
      formData.get("ilp_equipment_supply"),
    ),
    special_notes: String(formData.get("ilp_special_notes") ?? "").trim(),
  };
}

export function validateIlpDetails(d: IlmalampopumppuDetails): string | null {
  if (d.quote_layout === "two_independent_splits") {
    for (const unit of d.unit_installations) {
      if ((unit.coverage_area_m2 ?? 0) < 10) {
        return `Anna ${unit.label.toLowerCase()}lle arvioitu vaikutusalue (m²).`;
      }
    }
  } else if (d.heated_area_m2 < 10) {
    return "Anna arvioitu vaikutusalue (m²).";
  }

  if (d.system_type === "multi_split" && d.indoor_unit_count < 2) {
    return "Multisplit-järjestelmässä vähintään 2 sisäyksikköä.";
  }
  if (
    d.quote_layout === "two_independent_splits" &&
    d.system_type === "multi_split"
  ) {
    return "Kaksi erillistä split-laitetta ja multisplit eivät ole samaan aikaan valittavissa.";
  }
  if (d.schedule === "specific_date" && !d.installation_date) {
    return "Valitse toivottu asennuspäivä.";
  }
  if (!d.exterior_wall_material.trim()) return "Valitse ulkoseinän materiaali.";
  return null;
}

function buildUnitInstallationLines(unit: IlpUnitInstallation): string[] {
  return [
    `${unit.label}: vaikutusalue n. ${unit.coverage_area_m2} m²`,
    unit.pipe_distance_m
      ? `${unit.label}: putkimatka ulko–sisä n. ${unit.pipe_distance_m} m`
      : null,
    formatHeightLine(
      `${unit.label}, sisäyksikön korkeus`,
      unit.indoor_mount_height,
      unit.indoor_mount_height_m,
    ),
    formatHeightLine(
      `${unit.label}, ulkoyksikön korkeus`,
      unit.outdoor_mount_height,
      unit.outdoor_mount_height_m,
    ),
  ].filter((line): line is string => Boolean(line));
}

export function buildIlpDescription(d: IlmalampopumppuDetails): string {
  const coverageTotal = totalIlpCoverageM2(d);
  const lines = [
    formatEquipmentSupplyLine(d.equipment_supply),
    `Asennus: ${LABELS.installation_type[d.installation_type]}`,
    `Käyttötarkoitus: ${LABELS.usage[d.usage]}${
      d.usage === "cooling_only" || d.usage === "heating_and_cooling"
        ? `, ${LABELS.cooling_need[d.cooling_need]}`
        : ""
    }`,
    `Laatutaso: ${LABELS.quality_tier[d.quality_tier]}`,
    `Tarjousrakenne: ${LABELS.quote_layout[d.quote_layout]}`,
    d.quote_layout === "two_independent_splits"
      ? `Järjestelmä: kaksi erillistä split 1+1 -kokonaisuutta (yhteinen ulkoseinä: ${d.exterior_wall_material})`
      : `Järjestelmä: ${LABELS.system_type[d.system_type]}${
          d.system_type === "multi_split"
            ? ` (${d.indoor_unit_count} sisäyks.)`
            : ""
        }`,
    d.quote_layout === "two_independent_splits"
      ? `Kiinteistö: ${d.property_type}, yhteensä n. ${coverageTotal} m² (kahdelle laitteelle jaettuna)`
      : `Kiinteistö: ${d.property_type}, arvioitu vaikutusalue n. ${d.heated_area_m2} m² (ei koko rakennus)`,
    ...(d.quote_layout === "two_independent_splits"
      ? d.unit_installations.flatMap(buildUnitInstallationLines)
      : [
          d.pipe_distance_m_per_unit
            ? `Arvioitu putkimatka ulko- ja sisäyksikön välillä: n. ${d.pipe_distance_m_per_unit} m`
            : null,
          formatHeightLine(
            "Sisäyksikön asennuskorkeus",
            d.indoor_mount_height,
            d.indoor_mount_height_m,
          ),
          formatHeightLine(
            "Ulkoyksikön asennuskorkeus",
            d.outdoor_mount_height,
            d.outdoor_mount_height_m,
          ),
        ]),
    d.quote_layout === "single"
      ? `Ulkoseinä: ${d.exterior_wall_material}`
      : null,
    `Ulkoyksikön kiinnitys: ${LABELS.outdoor_mounting[d.outdoor_mounting]}`,
    `Suojakotelo ulkoyksikölle: ${d.outdoor_enclosure ? "Kyllä" : "Ei"}`,
    `Ulkoyksikön sähkösyöttö urakkaan: ${d.outdoor_electrical_included ? "Kyllä" : "Ei"}`,
    `Aikataulu: ${LABELS.schedule[d.schedule]}${
      d.schedule === "specific_date" && d.installation_date
        ? ` (${d.installation_date})`
        : ""
    }`,
    formatBudgetOfferPreference(
      d.budget_max_eur,
      d.accept_offers_over_budget,
    ),
    d.special_notes ? `\nErikoistoiveet:\n${d.special_notes}` : null,
    `Ilmastovyöhyke: ${CLIMATE_ZONE_LABELS[d.climate_zone]}`,
    d.build_year ? `Rakennusvuosi: ${d.build_year}` : null,
  ];

  const areaForPower =
    d.quote_layout === "two_independent_splits"
      ? Math.max(...d.unit_installations.map((u) => u.coverage_area_m2 ?? 0))
      : d.heated_area_m2;

  if (areaForPower >= 10) {
    if (d.usage === "heating_and_cooling") {
      const heat = estimateHeatingPowerKw({
        heatedAreaM2: areaForPower,
        climateZone: d.climate_zone,
        buildYear: d.build_year,
        variant: "air",
      });
      const cool = estimateCoolingPowerKw(
        areaForPower,
        d.cooling_need,
        d.climate_zone,
      );
      if (heat) {
        lines.push(
          d.quote_layout === "two_independent_splits"
            ? `${formatPowerEstimate(heat)} (suurin yksittäinen vaikutusalue)`
            : formatPowerEstimate(heat),
        );
      }
      if (cool) lines.push(formatPowerEstimate(cool));
    } else if (d.usage === "cooling_only") {
      const cool = estimateCoolingPowerKw(
        areaForPower,
        d.cooling_need,
        d.climate_zone,
      );
      if (cool) lines.push(formatPowerEstimate(cool));
    }
  }

  return lines.filter(Boolean).join("\n");
}

export function formatIlpDetailsSummary(d: IlmalampopumppuDetails): string {
  return buildIlpDescription(d);
}

export function isIlpDetails(value: unknown): value is IlmalampopumppuDetails {
  return (
    typeof value === "object" &&
    value !== null &&
    "installation_type" in value &&
    "usage" in value
  );
}
