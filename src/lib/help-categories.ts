export const HELP_CATEGORIES = [
  { id: "carrying", label: "Kantaminen", emoji: "🛋️" },
  { id: "moving", label: "Tavaroiden siirtäminen", emoji: "📦" },
  { id: "trailer", label: "Peräkärryn kanssa apu", emoji: "🚚" },
  { id: "ladder", label: "Tikkaiden kanssa apu", emoji: "🪜" },
  { id: "garden", label: "Oksat / risut", emoji: "🌳" },
  { id: "storage", label: "Vienti varastoon", emoji: "🧹" },
  { id: "furniture", label: "Huonekalun ulos kantaminen", emoji: "🏠" },
  { id: "heavy", label: "Painavan tavaran siirto", emoji: "👵" },
  { id: "practical", label: "Pieni käytännön apu", emoji: "🔧" },
] as const;

export type HelpCategoryId = (typeof HELP_CATEGORIES)[number]["id"];

export function helpCategoryLabel(id: string): string {
  return HELP_CATEGORIES.find((c) => c.id === id)?.label ?? "Apu";
}

export function helpCategoryEmoji(id: string): string {
  return HELP_CATEGORIES.find((c) => c.id === id)?.emoji ?? "🆘";
}

export const HELP_LOCATION_TYPES = [
  { id: "outdoor", label: "Ulkona / julkisella paikalla" },
  { id: "common_area", label: "Taloyhtiön yhteinen tila" },
] as const;

export type HelpLocationType = (typeof HELP_LOCATION_TYPES)[number]["id"];
