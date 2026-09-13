/** Yleiset puuttuvan tiedon tyypit — urakoitsija valitsee näistä. */
export type CompletionGapType =
  | "measurements"
  | "photos"
  | "device_model"
  | "location"
  | "scope_unclear"
  | "material_preference"
  | "other";

export const COMPLETION_GAP_TYPES: {
  id: CompletionGapType;
  label: string;
  hint: string;
}[] = [
  {
    id: "measurements",
    label: "Mitat puuttuvat",
    hint: "Esim. pinta-ala m², huoneen mitat, putkimatka.",
  },
  {
    id: "photos",
    label: "Kuvat puuttuvat",
    hint: "Nykytila, asennuspaikka tai vaurio.",
  },
  {
    id: "device_model",
    label: "Laitteen malli / merkki puuttuu",
    hint: "Lämpöpumppu, kattomateriaali tms.",
  },
  {
    id: "location",
    label: "Kohteen sijainti / asennuspaikka epäselvä",
    hint: "Missä työ tehdään tai minne laite asennetaan.",
  },
  {
    id: "scope_unclear",
    label: "Työn laajuus epäselvä",
    hint: "Koko uusinta vs. osittainen korjaus.",
  },
  {
    id: "material_preference",
    label: "Materiaalitoive puuttuu",
    hint: "Laatu, merkki tai materiaali.",
  },
  {
    id: "other",
    label: "Muu tieto",
    hint: "Kerro tarkemmin alla.",
  },
];

export function gapTypeLabel(id: string): string {
  return COMPLETION_GAP_TYPES.find((g) => g.id === id)?.label ?? id;
}

export function parseGapTypes(raw: string[]): CompletionGapType[] {
  const allowed = new Set(COMPLETION_GAP_TYPES.map((g) => g.id));
  return raw.filter((id): id is CompletionGapType =>
    allowed.has(id as CompletionGapType),
  );
}
