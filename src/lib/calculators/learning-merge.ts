import type { CalculatorConfig, CalculatorLineItem, CalculatorQuestion } from "./types";
import type { LearnedProposal } from "@/lib/learned-proposals";
import { proposalSlugFromLabel } from "@/lib/learned-proposals";

export function mergeApprovedProposalsIntoConfig(
  config: CalculatorConfig,
  proposals: LearnedProposal[],
): CalculatorConfig {
  const approved = proposals.filter((p) => p.jobSlug === config.jobSlug || p.jobSlug === "generic");
  if (approved.length === 0) return config;

  const existingLineIds = new Set(config.lineItems.map((l) => l.id));
  const existingQuestionIds = new Set((config.questions ?? []).map((q) => q.id));

  const newLines: CalculatorLineItem[] = [];
  const newQuestions: CalculatorQuestion[] = [];

  for (const proposal of approved) {
    if (proposal.kind === "addon") {
      const id = `learned-${proposal.slug}`;
      if (existingLineIds.has(id)) continue;
      existingLineIds.add(id);
      newLines.push({
        id,
        label: proposal.label,
        description: "Urakoitsijoiden yhteinen ehdotus — ota mukaan tarvittaessa",
        unit: "fixed",
        amount: 0,
        enabled: false,
        custom: true,
        searchHint: proposal.label,
      });
    }

    if (proposal.kind === "info_need") {
      const id = `learned-info-${proposal.slug}`;
      if (existingQuestionIds.has(id)) continue;
      existingQuestionIds.add(id);
      newQuestions.push({
        id,
        label: proposal.label,
        hint: "Usein pyydetty lisätieto tarjouspyynnöissä",
        mode: "detail",
        defaultOptionId: "unknown",
        options: [
          { id: "unknown", label: "En tiedä / ei koske" },
          { id: "yes", label: "Kyllä / koskee" },
          { id: "no", label: "Ei koske" },
        ],
      });
    }
  }

  if (newLines.length === 0 && newQuestions.length === 0) return config;

  return {
    ...config,
    lineItems: [...config.lineItems, ...newLines],
    questions: [...(config.questions ?? []), ...newQuestions],
  };
}

/** Apufunktio testeihin — slug otsikosta. */
export function learnedLineIdFromLabel(label: string): string {
  return `learned-${proposalSlugFromLabel(label)}`;
}
