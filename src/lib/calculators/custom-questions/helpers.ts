import type { CalculatorQuestion, PriceFactor, QuestionOptionEffect } from "../types";

type QOption = { id: string; label: string; effect?: QuestionOptionEffect };

export function q(
  id: string,
  label: string,
  mode: "quick" | "detail",
  defaultOptionId: string,
  options: QOption[],
  hint?: string,
): CalculatorQuestion {
  return { id, label, mode, defaultOptionId, options, hint };
}

export function pf(
  label: string,
  status: PriceFactor["status"],
  questionIds?: string[],
): PriceFactor {
  return questionIds ? { label, status, questionIds } : { label, status };
}

export function mult(lineId: string, factor: number): QuestionOptionEffect {
  return { lineMultipliers: { [lineId]: factor } };
}

export function amt(lineId: string, amount: number): QuestionOptionEffect {
  return { lineAmounts: { [lineId]: amount } };
}

export function toggle(lineId: string, enabled: boolean): QuestionOptionEffect {
  return { lineEnabled: { [lineId]: enabled } };
}

export function add(amount: number): QuestionOptionEffect {
  return { fixedAdd: amount };
}

/** Yleiset detail-kysymykset lisätöistä */
export function extraWorkQuestion(): CalculatorQuestion {
  return q("extra-work", "Yllättävät lisätyöt", "detail", "ei", [
    { id: "ei", label: "Ei odotettavissa", effect: {} },
    { id: "pieni", label: "Pieniä lisätöitä", effect: add(500) },
    { id: "merkittava", label: "Merkittäviä lisätöitä", effect: add(2000) },
  ]);
}

export function accessQuestion(workLine: string): CalculatorQuestion {
  return q(
    "site-access",
    "Pääsy kohteeseen / nostotyö",
    "detail",
    "helppo",
    [
      { id: "helppo", label: "Helpot kuljetukset", effect: {} },
      { id: "vaikea", label: "Vaikea (kerros, ahdas, korkea)", effect: mult(workLine, 1.1) },
    ],
    "Kerrostalossa ylin kerros ilman hissiä nostaa työkustannuksia.",
  );
}

export function demolitionQuestion(purkuLine: string): CalculatorQuestion {
  return q("demolition-scope", "Purkutyön laajuus", "quick", "normaali", [
    { id: "normaali", label: "Normaali", effect: {} },
    { id: "raskas", label: "Raskas / moninkertainen", effect: mult(purkuLine, 1.3) },
    { id: "ei", label: "Ei purkua", effect: toggle(purkuLine, false) },
  ]);
}

export function workDifficultyQuestion(workLine: string): CalculatorQuestion {
  return q("work-difficulty", "Työn vaikeus", "quick", "normaali", [
    { id: "helppo", label: "Helppo kohde", effect: mult(workLine, 0.95) },
    { id: "normaali", label: "Normaali", effect: {} },
    { id: "vaikea", label: "Vaikea kohde", effect: mult(workLine, 1.12) },
  ]);
}

export function materialQualityQuestion(materialLine: string): CalculatorQuestion {
  return q("material-quality", "Materiaali- / laitevalinta", "quick", "perus", [
    { id: "perus", label: "Perustaso", effect: {} },
    { id: "laadukas", label: "Laadukas", effect: mult(materialLine, 1.25) },
    { id: "premium", label: "Premium", effect: mult(materialLine, 1.5) },
  ]);
}

export function optionalLineQuestion(
  lineId: string,
  label: string,
): CalculatorQuestion {
  return q(`include-${lineId}`, label, "quick", "kylla", [
    { id: "kylla", label: "Kyllä / mukana", effect: toggle(lineId, true) },
    { id: "ei", label: "Ei tarvita", effect: toggle(lineId, false) },
  ]);
}
