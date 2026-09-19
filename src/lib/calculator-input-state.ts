import type { CalculatorConfig } from "@/lib/calculators/types";

export type CalculatorInputState = {
  primaryQty: number;
  secondaryQty: number;
  tierId: string | undefined;
  answers: Record<string, string>;
  estimateMode: "quick" | "detail";
};

export function defaultCalculatorAnswers(
  config: CalculatorConfig,
): Record<string, string> {
  const answers: Record<string, string> = {};
  for (const q of config.questions ?? []) {
    answers[q.id] = q.defaultOptionId;
  }
  return answers;
}

export function inputStateFromConfig(
  config: CalculatorConfig,
  overrides?: Partial<CalculatorInputState>,
): CalculatorInputState {
  const defaultTier = config.defaultTierId ?? config.tiers?.[0]?.id;
  return {
    primaryQty: config.primaryInput.defaultValue,
    secondaryQty: config.secondaryInput?.defaultValue ?? 0,
    tierId: defaultTier,
    answers: defaultCalculatorAnswers(config),
    estimateMode: "quick",
    ...overrides,
  };
}

/** Palauta laskurin syötteet snapshotista tai oletuksista. */
export function inputStateFromSnapshot(
  config: CalculatorConfig,
  snapshot: {
    primaryQty?: number;
    secondaryQty?: number;
    tierId?: string;
    answers?: Record<string, string>;
    estimateMode?: "quick" | "detail";
  } | null,
): CalculatorInputState {
  if (!snapshot) return inputStateFromConfig(config);
  return inputStateFromConfig(config, {
    primaryQty: snapshot.primaryQty,
    secondaryQty: snapshot.secondaryQty,
    tierId: snapshot.tierId,
    answers: snapshot.answers,
    estimateMode: snapshot.estimateMode,
  });
}
