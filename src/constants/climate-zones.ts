/** Suomen lämmitys-/ilmastovyöhykkeet (karkea jako energia-arvioihin). */
export type ClimateZone = "1" | "2" | "3" | "4";

export const CLIMATE_ZONE_OPTIONS: {
  value: ClimateZone;
  label: string;
}[] = [
  {
    value: "1",
    label: "Vyöhyke I — Etelä (esim. Helsinki, Turku, Ahvenanmaa)",
  },
  {
    value: "2",
    label: "Vyöhyke II — Keski (esim. Tampere, Jyväskylä, Kuopio)",
  },
  {
    value: "3",
    label: "Vyöhyke III — Pohjoinen (esim. Oulu, Rovaniemi rannikko)",
  },
  {
    value: "4",
    label: "Vyöhyke IV — Pohjoisin (Lapin sisämaa, Kainuu)",
  },
];

export const CLIMATE_ZONE_LABELS: Record<ClimateZone, string> = {
  "1": "Vyöhyke I (etelä)",
  "2": "Vyöhyke II (keski)",
  "3": "Vyöhyke III (pohjoinen)",
  "4": "Vyöhyke IV (pohjoinen sisämaa)",
};
