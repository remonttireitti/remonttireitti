export type ProjectInterest = "interested" | "not_interested";

export type ContractorWorkPreferences = {
  minBudgetEur: number | null;
};

/** Onko projektin budjetti urakoitsijan minimiin nähden riittävä. */
export function meetsMinBudget(
  minBudgetEur: number | null,
  budgetMin: number | null,
  budgetMax: number | null,
): boolean {
  if (minBudgetEur == null || minBudgetEur <= 0) return true;
  if (budgetMax != null) return budgetMax >= minBudgetEur;
  if (budgetMin != null) return budgetMin >= minBudgetEur;
  return true;
}

export function budgetBelowMin(
  minBudgetEur: number | null,
  budgetMin: number | null,
  budgetMax: number | null,
): boolean {
  if (minBudgetEur == null || minBudgetEur <= 0) return false;
  return !meetsMinBudget(minBudgetEur, budgetMin, budgetMax);
}

export type ContractorListFilter = "oma-alue" | "kaikki" | "kiinnostavat" | "piilotetut";

export function parseContractorListFilter(raw: string | undefined): ContractorListFilter {
  switch (raw) {
    case "kaikki":
      return "kaikki";
    case "kiinnostavat":
      return "kiinnostavat";
    case "piilotetut":
      return "piilotetut";
    default:
      return "oma-alue";
  }
}

export function filterContractorProjects<
  T extends {
    match: { recommended: boolean };
    interest: ProjectInterest | null;
    meetsMinBudget: boolean;
  },
>(projects: T[], filter: ContractorListFilter): T[] {
  switch (filter) {
    case "oma-alue":
      return projects.filter(
        (p) =>
          p.match.recommended &&
          p.meetsMinBudget &&
          p.interest !== "not_interested",
      );
    case "kaikki":
      return projects.filter((p) => p.interest !== "not_interested");
    case "kiinnostavat":
      return projects.filter((p) => p.interest === "interested");
    case "piilotetut":
      return projects.filter((p) => p.interest === "not_interested");
  }
}

export function countByFilter<
  T extends {
    match: { recommended: boolean };
    interest: ProjectInterest | null;
    meetsMinBudget: boolean;
  },
>(projects: T[]): Record<ContractorListFilter, number> {
  return {
    "oma-alue": filterContractorProjects(projects, "oma-alue").length,
    kaikki: filterContractorProjects(projects, "kaikki").length,
    kiinnostavat: filterContractorProjects(projects, "kiinnostavat").length,
    piilotetut: filterContractorProjects(projects, "piilotetut").length,
  };
}
