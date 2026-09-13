"use server";

import {
  fetchBudgetGuidanceForJob,
  type BudgetGuidance,
} from "@/lib/price-archive-server";

export async function getBudgetGuidance(
  jobSlug: string,
  postalCode?: string | null,
): Promise<BudgetGuidance | null> {
  if (!jobSlug.trim()) return null;
  return fetchBudgetGuidanceForJob(jobSlug, postalCode);
}
