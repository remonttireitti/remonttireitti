/** Yhden split- tai sisäyksikön realistinen vaikutusalue (m²). */
export const ILP_MAX_SINGLE_UNIT_COVERAGE_M2 = 140;

export const ILP_COVERAGE_AREA_HINT =
  "Arvio siitä tilasta, johon haluat laitteen vaikuttavan — ei koko rakennuksen pinta-alaa.";

export const ILP_LARGE_AREA_GUIDANCE =
  "Yli 140 m² vaikutusalueelle harvoin riittää yksi laite. Harkitse multisplit-järjestelmää tai kahta erillistä split-laitetta (kaksi tarjouspyyntöä yhdessä lomakkeessa).";

export type IlpCoolingNeed = "light" | "normal" | "demanding";

export const ILP_COOLING_NEED_OPTIONS: {
  value: IlpCoolingNeed;
  label: string;
  hint: string;
}[] = [
  {
    value: "light",
    label: "Kevyt",
    hint: "Esim. yksi makuuhuone tai pieni tila",
  },
  {
    value: "normal",
    label: "Normaali",
    hint: "Tyypillinen olohuone / kerros",
  },
  {
    value: "demanding",
    label: "Vaativa",
    hint: "Paljon lasia, aurinkoinen, usea huone kerralla",
  },
];
