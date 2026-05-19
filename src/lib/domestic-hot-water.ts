import type { PumpSizingVariant } from "@/lib/heat-pump-sizing";

/** Arvioitu käyttövesienergia (kWh/v) asukasluvun mukaan. */
export function estimateDhwThermalKwhPerYear(householdSize: number): number {
  const n = Math.max(1, Math.min(10, householdSize));
  const firstPerson = 1100;
  const additionalPerPerson = 850;
  return Math.round(firstPerson + (n - 1) * additionalPerPerson);
}

/** Suositeltu käyttövesivaraajan tilavuus (litraa). */
export function recommendedDhwTankLiters(householdSize: number): number {
  const n = Math.max(1, Math.min(10, householdSize));
  if (n === 1) return 200;
  if (n === 2) return 300;
  if (n === 3) return 300;
  if (n === 4) return 400;
  if (n === 5) return 500;
  if (n === 6) return 500;
  return Math.min(750, 550 + (n - 6) * 50);
}

export function providesDomesticHotWater(variant: PumpSizingVariant): boolean {
  return variant === "water" || variant === "ground";
}

export function dhwSystemLabel(variant: PumpSizingVariant): string {
  return variant === "ground" ? "maalämpöpumppu" : "vesi-ilmalämpöpumppu";
}

export function formatDhwPlanLines(
  householdSize: number,
  variant: PumpSizingVariant,
): string[] {
  if (!providesDomesticHotWater(variant)) return [];

  const kwh = estimateDhwThermalKwhPerYear(householdSize);
  const liters = recommendedDhwTankLiters(householdSize);
  const system = dhwSystemLabel(variant);

  return [
    `Käyttövesi: lämmitetään jatkossa ${system}lla (lämminvesivaraaja).`,
    `Arvioitu käyttövesienergia: n. ${kwh.toLocaleString("fi-FI")} kWh/v (${householdSize} henkilöä).`,
    `Suositeltu lämpöpatterivaraajan tilavuus: n. ${liters} l.`,
  ];
}

export function consumptionIncludesDhwNote(
  heatingType: string | null,
): string | null {
  if (!heatingType) return null;
  if (heatingType === "electricity") {
    return "Sähkölämmityksessä käyttövesi on aina sähköllä — se sisältyy ilmoitettuun kulutukseen.";
  }
  if (heatingType === "other") return null;
  return "Ilmoitettu kulutus sisältää yleensä myös käyttöveden saman lämmitystavan kautta.";
}
