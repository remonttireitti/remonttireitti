/** Asiakkaan suhtautuminen tarjouksiin suhteessa ilmoitettuun budjetin ylärajaan. */
export function parseAcceptOffersOverBudget(
  value: Partial<{
    accept_offers_over_budget?: boolean;
    /** @deprecated Väärä nimi — sama merkitys kuin accept_offers_over_budget */
    accept_offers_below_budget?: boolean;
  }>,
): boolean {
  if (typeof value.accept_offers_over_budget === "boolean") {
    return value.accept_offers_over_budget;
  }
  if (typeof value.accept_offers_below_budget === "boolean") {
    return value.accept_offers_below_budget;
  }
  return true;
}

export function formatBudgetOfferPreference(
  budgetMaxEur: number | null,
  acceptOverBudget: boolean,
): string {
  if (!budgetMaxEur) return "Budjetin ylärajaa ei ilmoitettu";
  const base = `Budjetin yläraja: n. ${budgetMaxEur} €`;
  if (acceptOverBudget) {
    return `${base} — tarjoukset sallittu myös budjetin ylärajan ylitse`;
  }
  return `${base} — toivotaan tarjouksia budjetin ylärajan sisällä`;
}
