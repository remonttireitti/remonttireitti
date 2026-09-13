import type { HeatPumpSlug } from "@/constants/heat-pumps";
import {
  pumpLabel,
  resolveCheckForPump,
  resolveGuideSummaryForPump,
  type TroubleshootingGuide,
} from "@/lib/troubleshooting-guides";

/** Hakukoneystävälliset otsikot — vastaavat todellisia hakukyselyitä. */
const SYMPTOM_SEO_TITLES: Record<string, string> = {
  "ei-lammita": "Lämpöpumppu ei lämmitä — mitä tarkistaa itse",
  "ei-jaahdyta": "Lämpöpumppu ei jäähdytä — tarkistuslista",
  jaaatyys: "Lämpöpumppu jäätyy — mitä tehdä",
  virhekoodi: "Lämpöpumpun virhekoodi — tarkistus ennen huoltoa",
  vuoto: "Lämpöpumpun vuoto — mitä tarkistaa itse",
  "outo-aani": "Lämpöpumpusta outoa ääntä — tarkistuslista",
  "korkea-kulutus": "Lämpöpumpun korkea kulutus — syyt ja tarkistukset",
  "etäohjaus": "Lämpöpumpun etäohjaus ei toimi — vian selvitys",
};

const SYMPTOM_SEO_KEYWORDS: Record<string, string[]> = {
  "ei-lammita": [
    "lämpöpumppu ei lämmitä",
    "ilmalämpöpumppu ei lämmitä",
    "ei tuota lämpöä",
    "talvella ei lämmitä",
  ],
  virhekoodi: [
    "lämpöpumppu virhekoodi",
    "ilmalämpöpumppu vikakoodi",
    "error code",
    "Mitsubishi virhekoodi",
    "Daikin virhekoodi",
  ],
  vuoto: ["lämpöpumppu vuoto", "vesivuoto lämpöpumpusta"],
  "korkea-kulutus": ["lämpöpumppu kulutus", "sähkölasku noussut lämpöpumppu"],
};

export function troubleshootingSymptomTitle(
  guide: TroubleshootingGuide,
  pump: HeatPumpSlug,
): string {
  const base = SYMPTOM_SEO_TITLES[guide.slug] ?? `${guide.title} — tarkista itse`;
  return `${base} (${pumpLabel(pump)})`;
}

export function troubleshootingSymptomDescription(
  guide: TroubleshootingGuide,
  pump: HeatPumpSlug,
): string {
  const summary = resolveGuideSummaryForPump(guide, pump);
  return `${summary} Ilmainen tarkistuslista ennen huoltokäyntiä — tarvittaessa kilpailuta huolto alueellasi.`.slice(
    0,
    160,
  );
}

export function troubleshootingSymptomKeywords(
  guide: TroubleshootingGuide,
  pump: HeatPumpSlug,
): string[] {
  const pumpKw =
    pump === "ilmalampopumppu"
      ? ["ilmalämpöpumppu", "ILP"]
      : pump === "ilmavesilampopumppu"
        ? ["vesi-ilmalämpöpumppu", "VILP"]
        : ["maalämpöpumppu", "maalämpö"];
  return [...(SYMPTOM_SEO_KEYWORDS[guide.slug] ?? []), ...pumpKw, "vian selvitys", "huolto"];
}

export function resolveCallProWhenForPump(
  guide: TroubleshootingGuide,
  pump: HeatPumpSlug,
): string[] {
  return guide.callProWhenByPump?.[pump] ?? guide.callProWhen;
}

export function troubleshootingHowToSteps(
  guide: TroubleshootingGuide,
  pump: HeatPumpSlug,
): { name: string; text: string }[] {
  return guide.safeChecks
    .map((check) => resolveCheckForPump(check, pump))
    .filter((step): step is { title: string; detail: string } => step != null)
    .map((step) => ({ name: step.title, text: step.detail }));
}
