import type {
  CalculatorQuestion,
  CalculatorTier,
  PriceFactor,
} from "./types";

type LineDef = { id: string; label: string; amount: number };

const WORK_LINE_IDS = new Set([
  "tyo",
  "asennus",
  "laatoitus-tyo",
  "maalaus",
  "pesu",
  "rapaus",
  "leikkuu",
  "siivous",
  "kuljetus",
  "muutto",
  "lumi",
]);

const PURKU_LINE_IDS = new Set([
  "purku",
  "vanhan-poisto",
  "korjaus",
]);

const MATERIAL_LINE_IDS = new Set([
  "laite",
  "kate",
  "kalusteet",
  "laatat",
  "materiaali",
  "maali",
  "paneelit",
  "paneelit",
  "ikkunat",
  "ovi",
  "kattila",
  "kalusteet",
  "pinnoite",
  "lattia",
  "verhous",
]);

const STRUCTURE_LINE_IDS = new Set([
  "aluskate",
  "eriste",
  "pohja",
  "tasoitus",
  "vesieristys",
  "perustus",
  "pinnat",
]);

const OPTIONAL_LINE_IDS = new Set([
  "rannit",
  "sadevesi",
  "maateline",
  "sahko-taulu",
  "vanhan-poisto",
  "ikkunat",
  "kaide",
  "nosturi",
  "hiekoitus",
  "pakkaus",
  "kerros",
  "kantaminen",
  "ohjaus",
  "portti",
  "lattialammitys",
]);

function findLineId(lineIds: string[], candidates: Set<string>): string | undefined {
  return lineIds.find((id) => candidates.has(id));
}

function findLineIdMatching(lineIds: string[], pattern: RegExp): string | undefined {
  return lineIds.find((id) => pattern.test(id));
}

type BuildDefaultsParams = {
  lines: LineDef[];
  tiers?: CalculatorTier[];
  primaryInputLabel: string;
};

export function buildDefaultQuestions(params: BuildDefaultsParams): CalculatorQuestion[] {
  const lineIds = params.lines.map((l) => l.id);
  const questions: CalculatorQuestion[] = [];

  const workLine =
    findLineId(lineIds, WORK_LINE_IDS) ??
    findLineIdMatching(lineIds, /tyo|asennus|pesu|maalaus/);
  const purkuLine =
    findLineId(lineIds, PURKU_LINE_IDS) ?? findLineIdMatching(lineIds, /purku/);
  const materialLine = findLineId(lineIds, MATERIAL_LINE_IDS);
  const structureLine = findLineId(lineIds, STRUCTURE_LINE_IDS);
  const sahkoLine = findLineIdMatching(lineIds, /sahko|sähkö/i);
  const optionalLine = findLineId(lineIds, OPTIONAL_LINE_IDS);

  if (workLine) {
    questions.push({
      id: "work-difficulty",
      label: "Työn vaikeus",
      hint: "Pääsy, korkeus ja työolot vaikuttavat työn hintaan.",
      mode: "quick",
      defaultOptionId: "normaali",
      options: [
        { id: "helppo", label: "Helppo", effect: { lineMultipliers: { [workLine]: 0.95 } } },
        { id: "normaali", label: "Normaali", effect: {} },
        { id: "vaikea", label: "Vaikea", effect: { lineMultipliers: { [workLine]: 1.12 } } },
      ],
    });
  }

  if (purkuLine) {
    questions.push({
      id: "demolition-scope",
      label: "Purkutyön laajuus",
      mode: "quick",
      defaultOptionId: "normaali",
      options: [
        { id: "normaali", label: "Normaali", effect: {} },
        { id: "raskas", label: "Raskas / laaja", effect: { lineMultipliers: { [purkuLine]: 1.3 } } },
        { id: "ei", label: "Ei purkua", effect: { lineEnabled: { [purkuLine]: false } } },
      ],
    });
  }

  if (!params.tiers?.length && materialLine) {
    questions.push({
      id: "material-quality",
      label: "Materiaali- / laitevalinta",
      mode: "quick",
      defaultOptionId: "perus",
      options: [
        { id: "perus", label: "Perustaso", effect: {} },
        { id: "laadukas", label: "Laadukas", effect: { lineMultipliers: { [materialLine]: 1.25 } } },
        { id: "premium", label: "Premium", effect: { lineMultipliers: { [materialLine]: 1.5 } } },
      ],
    });
  }

  if (optionalLine) {
    const line = params.lines.find((l) => l.id === optionalLine)!;
    questions.push({
      id: `include-${optionalLine}`,
      label: line.label,
      mode: "quick",
      defaultOptionId: "kylla",
      options: [
        { id: "kylla", label: "Kyllä / mukana", effect: { lineEnabled: { [optionalLine]: true } } },
        { id: "ei", label: "Ei tarvita", effect: { lineEnabled: { [optionalLine]: false } } },
      ],
    });
  }

  if (workLine) {
    questions.push({
      id: "site-access",
      label: "Pääsy kohteeseen",
      mode: "detail",
      defaultOptionId: "helppo",
      options: [
        { id: "helppo", label: "Helpot kuljetukset", effect: {} },
        {
          id: "vaikea",
          label: "Vaikea (kerros, ahdas)",
          effect: { lineMultipliers: { [workLine]: 1.08 } },
        },
      ],
    });
  }

  if (structureLine) {
    questions.push({
      id: "substrate-condition",
      label: "Alustan / rakenteen kunto",
      mode: "detail",
      defaultOptionId: "hyva",
      options: [
        { id: "hyva", label: "Hyvä", effect: {} },
        {
          id: "huono",
          label: "Huono, korjauksia",
          effect: { lineMultipliers: { [structureLine]: 1.25 } },
        },
      ],
    });
  }

  if (sahkoLine) {
    questions.push({
      id: "electrical-scope",
      label: "Sähkötyöt",
      mode: "detail",
      defaultOptionId: "perus",
      options: [
        { id: "perus", label: "Perustaso riittää", effect: {} },
        {
          id: "laaja",
          label: "Laajemmat sähkötyöt",
          effect: { lineMultipliers: { [sahkoLine]: 1.3 }, fixedAdd: 300 },
        },
      ],
    });
  }

  questions.push({
    id: "extra-work",
    label: "Yllättävät lisätyöt",
    mode: "detail",
    defaultOptionId: "ei",
    options: [
      { id: "ei", label: "Ei odotettavissa", effect: {} },
      { id: "pieni", label: "Pieniä lisätöitä", effect: { fixedAdd: 500 } },
      { id: "merkittava", label: "Merkittäviä lisätöitä", effect: { fixedAdd: 2000 } },
    ],
  });

  return questions;
}

export function buildDefaultPriceFactors(
  params: BuildDefaultsParams,
  questions: CalculatorQuestion[],
): PriceFactor[] {
  const factors: PriceFactor[] = [
    { label: params.primaryInputLabel, status: "included" },
  ];

  if (params.tiers?.length) {
    factors.push({ label: "Laite- / materiaalitaso", status: "included" });
  }

  const quickQuestions = questions.filter((q) => q.mode === "quick");
  const detailQuestions = questions.filter((q) => q.mode === "detail");

  if (quickQuestions.length > 0) {
    factors.push({
      label: "Perusvalinnat (työ, purku, materiaalit)",
      status: "included",
      questionIds: quickQuestions.map((q) => q.id),
    });
  }

  for (const q of detailQuestions.slice(0, 3)) {
    factors.push({
      label: q.label,
      status: "variable",
      questionIds: [q.id],
    });
  }

  if (detailQuestions.length > 3) {
    factors.push({
      label: "Muut tarkentavat tekijät",
      status: "variable",
      questionIds: detailQuestions.slice(3).map((q) => q.id),
    });
  }

  return factors.slice(0, 6);
}

const PRICE_QUESTION_RE = /paljonko|mitä maksaa|maksaa\?|hinta/i;

/** Rivikohtaiset FAQ-hinnat — ei korvata laskurin kokonaissummalla. */
const FAQ_LINE_PRICE_IDS = new Set([
  ...OPTIONAL_LINE_IDS,
  "lisaputki",
  "vesieristys",
  "patteri-liitos",
  "kaivo",
]);

const FAQ_STOPWORDS = new Set([
  "paljonko",
  "mita",
  "maksaa",
  "maksavat",
  "hinta",
  "onko",
  "miten",
  "kuuluu",
  "tyypillisesti",
  "suomessa",
  "asennettuna",
  "asennus",
  "noin",
  "yli",
  "per",
]);

export type FaqLineDef = {
  id: string;
  label: string;
  unit: "fixed" | "per_primary" | "per_secondary";
};

export type EnrichFaqOptions = {
  primaryUnit: string;
  lines?: readonly FaqLineDef[];
  secondaryUnit?: string;
};

function normalizeFaqText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function faqKeywords(value: string): string[] {
  return normalizeFaqText(value)
    .split(" ")
    .map((w) => w.replace(/^-+|-+$/g, ""))
    .filter((w) => w.length >= 4 && !FAQ_STOPWORDS.has(w));
}

/** Palauta rivikohtainen kohde, jos kysymys viittaa lisäriviin / osahintaan. */
export function matchFaqQuestionToLine(
  question: string,
  lines: readonly FaqLineDef[],
): FaqLineDef | undefined {
  const qNorm = normalizeFaqText(question);
  const qWords = faqKeywords(question);
  if (!qWords.length) return undefined;

  let best: { line: FaqLineDef; score: number } | undefined;

  for (const line of lines) {
    const idNorm = normalizeFaqText(line.id.replace(/-/g, " "));
    const labelNorm = normalizeFaqText(line.label);
    const haystack = `${idNorm} ${labelNorm}`;
    let score = 0;

    for (const word of qWords) {
      if (haystack.includes(word) || word.includes(idNorm.replace(/\s+/g, ""))) {
        score += word.length >= 6 ? 2 : 1;
      }
    }

    // Vahva osuma: rivin id-slug esiintyy kysymyksessä (lisaputki, vesieristys…)
    const idCompact = line.id.replace(/-/g, "");
    if (qNorm.replace(/\s+/g, "").includes(normalizeFaqText(idCompact).replace(/\s+/g, ""))) {
      score += 3;
    }

    const isLineSpecific =
      line.unit === "per_secondary" || FAQ_LINE_PRICE_IDS.has(line.id);
    if (!isLineSpecific) continue;
    if (score <= 0) continue;
    if (!best || score > best.score) best = { line, score };
  }

  return best && best.score >= 2 ? best.line : undefined;
}

function lineFaqUnitSuffix(line: FaqLineDef): string {
  if (line.unit === "per_secondary") {
    return `/{line:${line.id}:unit}`;
  }
  if (line.unit === "per_primary") {
    return `/{primaryUnit}`;
  }
  return "";
}

function buildLineFaqAnswer(line: FaqLineDef): string {
  const unit = lineFaqUnitSuffix(line);
  if (line.unit === "per_secondary") {
    return (
      `Laskurin rivihinta ({line:${line.id}:label}): {line:${line.id}:range}${unit}. ` +
      `Todennäköinen taso noin {line:${line.id}:mid}${unit}.`
    );
  }
  if (line.unit === "per_primary") {
    return (
      `Laskurin rivihinta ({line:${line.id}:label}): {line:${line.id}:range}/{primaryUnit} ` +
      `eli {defaultSize} kohteella noin {line:${line.id}:mid} × määrä. Todennäköinen taso noin {line:${line.id}:mid}/{primaryUnit}.`
    );
  }
  return (
    `Laskurin rivihinta ({line:${line.id}:label}): {line:${line.id}:range}. ` +
    `Todennäköinen taso noin {line:${line.id}:mid}.`
  );
}

export function enrichFaqAnswer(
  question: string,
  answer: string,
  primaryUnitOrOpts: string | EnrichFaqOptions,
): string {
  const opts: EnrichFaqOptions =
    typeof primaryUnitOrOpts === "string"
      ? { primaryUnit: primaryUnitOrOpts }
      : primaryUnitOrOpts;

  if (!PRICE_QUESTION_RE.test(question)) return answer;
  // Säilytä vastaukset, joissa hinta tulee jo tokeneista (kokonais- tai rivikohtainen).
  if (/\{total(Range|Mid|Low|High)\}|\{line:[\w-]+:(range|mid|low|high)\}/.test(answer)) {
    return answer;
  }

  const matchedLine = matchFaqQuestionToLine(question, opts.lines ?? []);
  if (matchedLine) {
    return buildLineFaqAnswer(matchedLine);
  }

  if (opts.primaryUnit === "m²") {
    return "Laskurin oletus ({defaultSize}) antaa {totalRange} (noin {totalMid}, noin {perUnitMid}/{primaryUnit}).";
  }

  return "Laskurin oletus ({defaultSize}) antaa {totalRange}. Todennäköinen taso noin {totalMid}.";
}
