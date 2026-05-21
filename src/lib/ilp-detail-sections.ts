import { CLIMATE_ZONE_LABELS } from "@/constants/climate-zones";
import { EQUIPMENT_SUPPLY_LABELS } from "@/lib/equipment-supply";
import {
  estimateCoolingPowerKw,
  estimateHeatingPowerKw,
} from "@/lib/heat-pump-sizing";
import { totalIlpCoverageM2 } from "@/lib/ilmalampopumppu-details";
import type {
  IlmalampopumppuDetails,
  IlpMountHeight,
  IlpUnitInstallation,
} from "@/types/ilmalampopumppu-details";
export type DetailRow = { label: string; value: string };

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  omakotitalo: "Omakotitalo",
  rivitalo: "Rivitalo",
  paritalo: "Paritalo",
  kerrostalo: "Kerrostalo",
  muu: "Muu",
};

const WALL_LABELS: Record<string, string> = {
  puu: "Puu",
  betoni: "Betoni",
  tiili: "Tiili",
  kivi: "Kivi",
  teräs: "Teräs / harkko",
  muu: "Muu",
};

const LABELS = {
  installation_type: {
    new: "Uusi asennus",
    replacement: "Pumpun vaihto",
  },
  usage: {
    cooling_only: "Vain viilennys",
    heating_and_cooling: "Lämmitys ja viilennys",
  },
  quality_tier: {
    budget: "Budjetti",
    standard: "Perus",
    premium: "Paras",
  },
  system_type: {
    split_1_1: "1 sisä + 1 ulkoyksikkö",
    multi_split: "Multisplit",
  },
  quote_layout: {
    single: "Yksi järjestelmä",
    two_independent_splits: "Kaksi erillistä split-laitetta",
  },
  outdoor_mounting: {
    ground: "Maateline",
    wall: "Seinäteline",
    plinth: "Sokkeliteline",
    balcony: "Parveketeline",
  },
  schedule: {
    asap: "Heti",
    flexible: "Ei kiire",
    specific_date: "Tietty päivä",
  },
  cooling_need: {
    light: "Kevyt",
    normal: "Normaali",
    demanding: "Vaativa",
  },
} as const;

function formatHeight(h: IlpMountHeight, m: number | null): string {
  if (h === "over_3m" && m) return `Yli 3 m (${m} m)`;
  return h === "over_3m" ? "Yli 3 m" : "Alle 3 m";
}

function unitRows(unit: IlpUnitInstallation): DetailRow[] {
  const rows: DetailRow[] = [
    {
      label: "Vaikutusalue",
      value: unit.coverage_area_m2
        ? `n. ${unit.coverage_area_m2} m²`
        : "—",
    },
  ];
  if (unit.pipe_distance_m) {
    rows.push({
      label: "Putkimatka",
      value: `n. ${unit.pipe_distance_m} m`,
    });
  }
  rows.push(
    {
      label: "Sisäyksikön korkeus",
      value: formatHeight(unit.indoor_mount_height, unit.indoor_mount_height_m),
    },
    {
      label: "Ulkoyksikön korkeus",
      value: formatHeight(unit.outdoor_mount_height, unit.outdoor_mount_height_m),
    },
  );
  return rows;
}

export type IlpDetailSection = {
  title: string;
  rows: DetailRow[];
};

export function getIlpDetailSections(d: IlmalampopumppuDetails): IlpDetailSection[] {
  const isDual = d.quote_layout === "two_independent_splits";
  const propertyLabel =
    PROPERTY_TYPE_LABELS[d.property_type] ?? d.property_type;

  const sections: IlpDetailSection[] = [
    {
      title: "Tarjouspyynnön laajuus",
      rows: [
        {
          label: "Laajuus",
          value:
            EQUIPMENT_SUPPLY_LABELS[d.equipment_supply] +
            (d.equipment_supply === "installation_only" &&
            d.allow_optional_equipment_offer
              ? " — urakoitsija voi tarjota laitetta erikseen"
              : ""),
        },
        {
          label: "Tarjousrakenne",
          value: LABELS.quote_layout[d.quote_layout],
        },
        {
          label: "Laatutaso",
          value: LABELS.quality_tier[d.quality_tier],
        },
        {
          label: "Asennus",
          value: LABELS.installation_type[d.installation_type],
        },
      ],
    },
    {
      title: "Kiinteistö",
      rows: [
        { label: "Kiinteistön tyyppi", value: propertyLabel },
        ...(isDual
          ? [
              {
                label: "Vaikutusalue yhteensä",
                value: `n. ${totalIlpCoverageM2(d)} m²`,
              },
            ]
          : [
              {
                label: "Arvioitu vaikutusalue",
                value: `n. ${d.heated_area_m2} m² (ei koko rakennus)`,
              },
            ]),
        ...(d.build_year
          ? [{ label: "Rakennusvuosi", value: String(d.build_year) }]
          : []),
        {
          label: "Ilmastovyöhyke",
          value: CLIMATE_ZONE_LABELS[d.climate_zone],
        },
      ],
    },
    {
      title: "Käyttö ja järjestelmä",
      rows: [
        { label: "Käyttötarkoitus", value: LABELS.usage[d.usage] },
        {
          label: "Jäähdytystarve",
          value: LABELS.cooling_need[d.cooling_need],
        },
        ...(isDual
          ? [
              {
                label: "Järjestelmä",
                value: "Kaksi erillistä split 1+1",
              },
            ]
          : [
              {
                label: "Järjestelmä",
                value:
                  d.system_type === "multi_split"
                    ? `${LABELS.system_type.multi_split} (${d.indoor_unit_count} sisäyks.)`
                    : LABELS.system_type.split_1_1,
              },
            ]),
      ],
    },
  ];

  if (isDual) {
    for (const unit of d.unit_installations) {
      sections.push({
        title: unit.label,
        rows: unitRows(unit),
      });
    }
    sections.push({
      title: "Yhteiset asennustiedot",
      rows: [
        {
          label: "Ulkoseinän materiaali",
          value: WALL_LABELS[d.exterior_wall_material] ?? d.exterior_wall_material,
        },
        {
          label: "Ulkoyksikön kiinnitys",
          value: LABELS.outdoor_mounting[d.outdoor_mounting],
        },
        {
          label: "Suojakotelo",
          value: d.outdoor_enclosure ? "Kyllä" : "Ei",
        },
        {
          label: "Sähkösyöttö urakkaan",
          value: d.outdoor_electrical_included ? "Kyllä" : "Ei",
        },
      ],
    });
  } else {
    const installRows: DetailRow[] = [];
    if (d.pipe_distance_m_per_unit) {
      installRows.push({
        label: "Putkimatka ulko–sisä",
        value: `n. ${d.pipe_distance_m_per_unit} m`,
      });
    }
    installRows.push(
      {
        label: "Sisäyksikön korkeus",
        value: formatHeight(d.indoor_mount_height, d.indoor_mount_height_m),
      },
      {
        label: "Ulkoyksikön korkeus",
        value: formatHeight(d.outdoor_mount_height, d.outdoor_mount_height_m),
      },
      {
        label: "Ulkoseinän materiaali",
        value: WALL_LABELS[d.exterior_wall_material] ?? d.exterior_wall_material,
      },
      {
        label: "Ulkoyksikön kiinnitys",
        value: LABELS.outdoor_mounting[d.outdoor_mounting],
      },
      {
        label: "Suojakotelo",
        value: d.outdoor_enclosure ? "Kyllä" : "Ei",
      },
      {
        label: "Sähkösyöttö urakkaan",
        value: d.outdoor_electrical_included ? "Kyllä" : "Ei",
      },
    );
    sections.push({ title: "Asennustekniset tiedot", rows: installRows });
  }

  const areaForPower = isDual
    ? Math.max(...d.unit_installations.map((u) => u.coverage_area_m2 ?? 0))
    : d.heated_area_m2;

  const estimateRows: DetailRow[] = [];
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
        estimateRows.push({
          label: "Lämpöteho (täydentävä)",
          value: `n. ${heat.kwMin}–${heat.kwMax} kW (tyyp. ${heat.kwTypical} kW)`,
        });
      }
      if (cool) {
        estimateRows.push({
          label: "Jäähdytysteho",
          value: `n. ${cool.kwMin}–${cool.kwMax} kW (tyyp. ${cool.kwTypical} kW)`,
        });
      }
    } else if (d.usage === "cooling_only") {
      const cool = estimateCoolingPowerKw(
        areaForPower,
        d.cooling_need,
        d.climate_zone,
      );
      if (cool) {
        estimateRows.push({
          label: "Jäähdytysteho",
          value: `n. ${cool.kwMin}–${cool.kwMax} kW (tyyp. ${cool.kwTypical} kW)`,
        });
      }
    }
  }
  if (estimateRows.length > 0) {
    sections.push({
      title: "Suuntaa-antava tehoarvio",
      rows: estimateRows,
    });
  }

  const scheduleRows: DetailRow[] = [
    { label: "Aikataulu", value: LABELS.schedule[d.schedule] },
  ];
  if (d.schedule === "specific_date" && d.installation_date) {
    scheduleRows.push({
      label: "Toivottu päivä",
      value: d.installation_date,
    });
  }
  if (d.budget_max_eur) {
    scheduleRows.push({
      label: "Budjetin yläraja",
      value: `n. ${d.budget_max_eur} €`,
    });
    scheduleRows.push({
      label: "Tarjoukset budjetin yli",
      value: d.accept_offers_over_budget ? "Sallittu" : "Ei toivottu",
    });
  }

  sections.push({ title: "Aikataulu ja budjetti", rows: scheduleRows });

  if (d.special_notes.trim()) {
    sections.push({
      title: "Erikoistoiveet",
      rows: [{ label: "Huomiot", value: d.special_notes.trim() }],
    });
  }

  return sections;
}

/** Pitääkö vanha kuvaus-kenttä piilossa (sama sisältö kuin strukturoitu data)? */
export function ilpDescriptionIsRedundant(
  description: string,
  d: IlmalampopumppuDetails,
): boolean {
  const normalized = description.trim();
  if (!normalized) return true;
  // Luotu buildIlpDescriptionilla — sama kuin laatikot
  return (
    normalized.includes("Tarjousrakenne:") &&
    normalized.includes("Ilmastovyöhyke:")
  );
}
