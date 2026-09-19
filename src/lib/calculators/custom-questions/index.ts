import { LAMMITYS_CUSTOM } from "./lammitys";
import { LVI_CUSTOM } from "./lvi";
import { PALVELUT_CUSTOM } from "./palvelut";
import { PERUSTUS_CUSTOM } from "./perustus";
import { PIHA_CUSTOM } from "./piha";
import { PUULAMMITYS_CUSTOM } from "./puulammitys";
import { SAHKO_CUSTOM } from "./sahko";
import { SISATILAT_CUSTOM } from "./sisatilat";
import type { CustomCalculatorQuestions } from "./types";
import { ULKOKUORI_CUSTOM } from "./ulkokuori";

export const CUSTOM_CALCULATOR_QUESTIONS: Record<string, CustomCalculatorQuestions> = {
  ...LAMMITYS_CUSTOM,
  ...PUULAMMITYS_CUSTOM,
  ...SAHKO_CUSTOM,
  ...LVI_CUSTOM,
  ...SISATILAT_CUSTOM,
  ...ULKOKUORI_CUSTOM,
  ...PERUSTUS_CUSTOM,
  ...PIHA_CUSTOM,
  ...PALVELUT_CUSTOM,
};

export function getCustomQuestions(slug: string): CustomCalculatorQuestions | undefined {
  return CUSTOM_CALCULATOR_QUESTIONS[slug];
}

export type { CustomCalculatorQuestions } from "./types";
