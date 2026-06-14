import { parseAcceptOffersOverBudget } from "@/lib/budget-preferences";
import { isHeatingSystemDetails } from "@/lib/heating-system-details";
import { isIlpDetails } from "@/lib/ilmalampopumppu-details";

export type ProjectBudgetInfo = {
  budgetMaxEur: number | null;
  budgetMinEur: number | null;
  acceptOffersOverBudget: boolean;
};

type ProjectDetailsJson = {
  ilmalampopumppu?: unknown;
  ilmavesilampopumppu?: unknown;
  maalampopumppu?: unknown;
  budget_prefs?: Partial<{ accept_offers_over_budget?: boolean }>;
};

export function getProjectBudgetInfo(project: {
  budget_min: number | null;
  budget_max: number | null;
  details: unknown;
}): ProjectBudgetInfo {
  let budgetMaxEur = project.budget_max;
  let budgetMinEur = project.budget_min;
  let acceptOffersOverBudget = true;

  const details = project.details as ProjectDetailsJson | null;
  if (details) {
    for (const raw of [
      details.ilmalampopumppu,
      details.ilmavesilampopumppu,
      details.maalampopumppu,
    ]) {
      if (isIlpDetails(raw)) {
        if (raw.budget_max_eur != null) budgetMaxEur = raw.budget_max_eur;
        acceptOffersOverBudget = raw.accept_offers_over_budget;
        break;
      }
      if (isHeatingSystemDetails(raw)) {
        if (raw.budget_max_eur != null) budgetMaxEur = raw.budget_max_eur;
        acceptOffersOverBudget = parseAcceptOffersOverBudget(raw);
        break;
      }
    }
    if (details.budget_prefs) {
      acceptOffersOverBudget = parseAcceptOffersOverBudget(details.budget_prefs);
    }
  }

  return { budgetMaxEur, budgetMinEur, acceptOffersOverBudget };
}

export function bidAmountExceedsBudget(
  amountEuros: number,
  budget: ProjectBudgetInfo,
): boolean {
  if (budget.budgetMaxEur == null || budget.budgetMaxEur <= 0) return false;
  if (!Number.isFinite(amountEuros) || amountEuros <= 0) return false;
  return amountEuros > budget.budgetMaxEur;
}

/** Estää lähetyksen, kun asiakas ei halua tarjouksia budjetin yli. */
export function getOverBudgetBlockError(
  amountEuros: number,
  budget: ProjectBudgetInfo,
): string | null {
  if (!bidAmountExceedsBudget(amountEuros, budget)) return null;
  if (budget.acceptOffersOverBudget) return null;

  const formattedMax = (budget.budgetMaxEur ?? 0).toLocaleString("fi-FI");
  return `Asiakas ei hyväksy tarjouksia yli ${formattedMax} €. Laske hinta tämän alle tai jätä tarjous toiseen pyyntöön.`;
}

/** Vahvistus vain kun ylitys on sallittu mutta halutaan varoittaa. */
export function buildOverBudgetConfirmMessage(
  amountEuros: number,
  budget: ProjectBudgetInfo,
): string | null {
  if (!bidAmountExceedsBudget(amountEuros, budget)) return null;
  if (!budget.acceptOffersOverBudget) return null;

  const formattedAmount = amountEuros.toLocaleString("fi-FI");
  const formattedMax = (budget.budgetMaxEur ?? 0).toLocaleString("fi-FI");
  return `Tarjouksesi (${formattedAmount} €) ylittää asiakkaan budjetin ylärajan (${formattedMax} €).\n\nHaluatko varmasti lähettää tarjouksen?`;
}
