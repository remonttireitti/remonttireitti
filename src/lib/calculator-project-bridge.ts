import type { CalculatorInputState } from "@/lib/calculator-input-state";
import type { CalculatorConfig, CalculatorQuestion } from "@/lib/calculators/types";
import type { IlmalampopumppuDetails } from "@/types/ilmalampopumppu-details";
import type { IlmavesilampopumppuDetails } from "@/types/ilmavesilampopumppu-details";
import type { MaalampopumppuDetails } from "@/types/maalampopumppu-details";
import { INITIAL_ILP_DETAILS } from "@/types/ilmalampopumppu-details";

function appendNote(notes: string, line: string): string {
  const trimmed = notes.trim();
  if (!trimmed) return line;
  if (trimmed.includes(line)) return trimmed;
  return `${trimmed}\n${line}`;
}

function answerLabel(
  questions: CalculatorQuestion[] | undefined,
  questionId: string,
  answerId: string | undefined,
): string | null {
  if (!answerId) return null;
  const question = questions?.find((q) => q.id === questionId);
  const option = question?.options.find((o) => o.id === answerId);
  return option?.label ?? null;
}

function ilpPipeDistanceM(inputs: CalculatorInputState): number | null {
  if (inputs.secondaryQty > 0) return 4 + inputs.secondaryQty;
  switch (inputs.answers["putkireitti"]) {
    case "normaali":
      return 4;
    case "pitka":
      return 6;
    case "erittain-pitka":
      return 10;
    default:
      return null;
  }
}

function mapIlpQualityTier(tierId: string | undefined): IlmalampopumppuDetails["quality_tier"] | null {
  if (tierId === "premium") return "premium";
  if (tierId === "perus" || tierId === "budget") return "standard";
  if (tierId === "budjetti") return "budget";
  return null;
}

type BridgeMode = "prefill" | "sync";

function shouldApply(
  mode: BridgeMode,
  key: keyof IlmalampopumppuDetails,
  current: IlmalampopumppuDetails,
): boolean {
  if (mode === "sync") return true;
  return JSON.stringify(current[key]) === JSON.stringify(INITIAL_ILP_DETAILS[key]);
}

/** Täytä ILP-lomake laskurin syötteistä. */
export function applyCalculatorToIlpDetails(
  current: IlmalampopumppuDetails,
  inputs: CalculatorInputState,
  config?: CalculatorConfig,
  mode: BridgeMode = "prefill",
): IlmalampopumppuDetails {
  const next = { ...current };

  const quality = mapIlpQualityTier(inputs.tierId);
  if (quality && shouldApply(mode, "quality_tier", current)) {
    next.quality_tier = quality;
  }

  const vanha = inputs.answers["vanha-laite"];
  if (vanha === "kylla" && shouldApply(mode, "installation_type", current)) {
    next.installation_type = "replacement";
  } else if (vanha === "ei" && shouldApply(mode, "installation_type", current)) {
    next.installation_type = "new";
  }

  const ulko = inputs.answers["ulkoyksikko"];
  if (ulko === "maateline" && shouldApply(mode, "outdoor_mounting", current)) {
    next.outdoor_mounting = "ground";
  } else if (ulko === "seinä" && shouldApply(mode, "outdoor_mounting", current)) {
    next.outdoor_mounting = "wall";
  }
  if (ulko === "korkea" && shouldApply(mode, "outdoor_mount_height", current)) {
    next.outdoor_mount_height = "over_3m";
  } else if (ulko !== "korkea" && mode === "sync") {
    next.outdoor_mount_height = "under_3m";
  }

  const pipeDistance = ilpPipeDistanceM(inputs);
  if (pipeDistance != null && (mode === "sync" || current.pipe_distance_m_per_unit == null)) {
    next.pipe_distance_m_per_unit = pipeDistance;
  }

  const sahko = inputs.answers["sahko"];
  if (sahko === "taululta" || sahko === "taululta-pitka") {
    if (shouldApply(mode, "outdoor_electrical_included", current)) {
      next.outdoor_electrical_included = true;
    }
  }

  if (inputs.answers["lapivienti"] === "timantti") {
    if (shouldApply(mode, "exterior_wall_material", current)) {
      next.exterior_wall_material = "betoni";
    }
    if (mode === "prefill" && !next.special_notes.includes("timanttiporaus")) {
      next.special_notes = appendNote(
        next.special_notes,
        "Seinäläpivienti: betoni/tiili (timanttiporaus).",
      );
    }
  }

  const kondenssi = inputs.answers["kondenssivesi"];
  if (kondenssi === "pumppu" && mode === "prefill") {
    next.special_notes = appendNote(
      next.special_notes,
      "Kondenssivesipumppu tarvitaan.",
    );
  }

  if (inputs.primaryQty >= 2) {
    if (inputs.primaryQty === 2) {
      if (shouldApply(mode, "quote_layout", current)) {
        next.quote_layout = "two_independent_splits";
      }
    } else if (shouldApply(mode, "system_type", current)) {
      next.system_type = "multi_split";
      next.indoor_unit_count = inputs.primaryQty;
    }
  } else if (mode === "sync" && inputs.primaryQty === 1) {
    next.quote_layout = "single";
    next.system_type = "split_1_1";
    next.indoor_unit_count = 1;
  }

  return next;
}

export function applyCalculatorToIvlpDetails(
  current: IlmavesilampopumppuDetails,
  inputs: CalculatorInputState,
  config?: CalculatorConfig,
): IlmavesilampopumppuDetails {
  const next = { ...current };
  const quality = mapIlpQualityTier(inputs.tierId);
  if (quality && current.quality_tier === "standard") {
    next.quality_tier = quality;
  }

  if (inputs.secondaryQty > 0) {
    next.special_notes = appendNote(
      next.special_notes,
      `Putkireitin pituus arvio: noin ${inputs.secondaryQty} m.`,
    );
  }

  const patteriverkko = answerLabel(
    config?.questions,
    "patteriverkko",
    inputs.answers["patteriverkko"],
  );
  if (patteriverkko && inputs.answers["patteriverkko"] !== "hyva") {
    next.special_notes = appendNote(next.special_notes, `Patteriverkko: ${patteriverkko}.`);
  }

  const asennus = answerLabel(config?.questions, "asennus", inputs.answers["asennus"]);
  if (asennus && inputs.answers["asennus"] !== "normaali") {
    next.special_notes = appendNote(next.special_notes, `Asennuksen vaativuus: ${asennus}.`);
  }

  return next;
}

export function applyCalculatorToMaalampDetails(
  current: MaalampopumppuDetails,
  inputs: CalculatorInputState,
  config?: CalculatorConfig,
): MaalampopumppuDetails {
  const next = { ...current };
  const quality = mapIlpQualityTier(inputs.tierId);
  if (quality && current.quality_tier === "standard") {
    next.quality_tier = quality;
  }

  if (
    config?.primaryInput.unit === "m²" &&
    inputs.primaryQty > 0 &&
    current.heated_area_m2 === 150
  ) {
    next.heated_area_m2 = inputs.primaryQty;
  }

  const kaivo = answerLabel(config?.questions, "kaivotyyppi", inputs.answers["kaivotyyppi"]);
  if (kaivo && inputs.answers["kaivotyyppi"] !== "poraus") {
    next.special_notes = appendNote(next.special_notes, `Maalämpökeruu: ${kaivo}.`);
  }

  const patterit = answerLabel(config?.questions, "patterit", inputs.answers["patterit"]);
  if (patterit && inputs.answers["patterit"] !== "patterit") {
    next.special_notes = appendNote(next.special_notes, `Lämmönjako: ${patterit}.`);
  }

  return next;
}

/** Rakenna kuvaus geneerisille työlajeille laskurin syötteistä. */
export function buildGenericDescriptionFromInputs(
  config: CalculatorConfig,
  inputs: CalculatorInputState,
  existingDescription: string,
): string {
  const lines: string[] = [];
  lines.push(
    `${config.primaryInput.label}: ${inputs.primaryQty} ${config.primaryInput.unit}.`,
  );

  if (config.secondaryInput && inputs.secondaryQty > 0) {
    lines.push(
      `${config.secondaryInput.label}: ${inputs.secondaryQty} ${config.secondaryInput.unit}.`,
    );
  }

  if (config.tiers && inputs.tierId) {
    const tier = config.tiers.find((t) => t.id === inputs.tierId);
    if (tier) lines.push(`Laite- / materiaalitaso: ${tier.label}.`);
  }

  for (const q of config.questions ?? []) {
    const answerId = inputs.answers[q.id] ?? q.defaultOptionId;
    if (answerId === q.defaultOptionId) continue;
    const label = answerLabel(config.questions, q.id, answerId);
    if (label) lines.push(`${q.label}: ${label}.`);
  }

  const block = lines.join("\n");
  const trimmed = existingDescription.trim();
  if (!trimmed) return block;
  if (trimmed.includes(block.split("\n")[0]!)) return trimmed;
  return `${block}\n\n${trimmed}`;
}

/** Otsikko-ehdotus pinta-alatyölajeille. */
export function suggestedTitleFromInputs(
  config: CalculatorConfig,
  inputs: CalculatorInputState,
  jobName: string,
): string | null {
  if (config.primaryInput.unit !== "m²" || inputs.primaryQty <= 0) return null;
  return `${jobName}, n. ${inputs.primaryQty} m²`;
}
