import {
  PROJECT_AREAS,
  type ProjectAreaSlug,
} from "@/constants/project-areas";

/** Arvioijan oikeudet = samat alueet kuin tarjouspyynnöissä. */
export const EVALUATOR_SCOPE_AREAS = PROJECT_AREAS.map((a) => ({
  slug: a.slug,
  title: a.title,
  description: a.description,
}));

export const ALL_EVALUATOR_SCOPE_SLUGS = EVALUATOR_SCOPE_AREAS.map((a) => a.slug);

export type EvaluatorScopeSlug = ProjectAreaSlug | "heat_pump" | "general";

const LEGACY_HEAT_PUMP: EvaluatorScopeSlug[] = ["heat_pump", "lammitys"];
const LEGACY_GENERAL: EvaluatorScopeSlug[] = [
  "general",
  ...ALL_EVALUATOR_SCOPE_SLUGS.filter((s) => s !== "lammitys"),
];

/** Vanhat scope-arvot yhteensopivuutta varten. */
export function expandEvaluatorScopesForQueue(scopes: string[]): string[] {
  const out = new Set<string>();
  for (const scope of scopes) {
    if (scope === "heat_pump") {
      LEGACY_HEAT_PUMP.forEach((s) => out.add(s));
      continue;
    }
    if (scope === "general") {
      LEGACY_GENERAL.forEach((s) => out.add(s));
      continue;
    }
    out.add(scope);
  }
  return [...out];
}

export function evaluatorScopeLabel(scope: string): string {
  const area = EVALUATOR_SCOPE_AREAS.find((a) => a.slug === scope);
  if (area) return area.title;
  if (scope === "heat_pump") return "Lämpöpumput (vanha)";
  if (scope === "general") return "Yleinen remontti (vanha)";
  return scope;
}

export function parseEvaluatorScopesFromFormData(formData: FormData): ProjectAreaSlug[] {
  const selected: ProjectAreaSlug[] = [];
  for (const area of EVALUATOR_SCOPE_AREAS) {
    if (formData.get(`scope_${area.slug}`) === "on") {
      selected.push(area.slug);
    }
  }
  return selected;
}
