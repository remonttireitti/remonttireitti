import { HEAT_PUMP_JOB_SLUGS } from "@/constants/heat-pumps";
import type {
  ElectricalQualification,
  LviQualification,
  RefrigerantLicense,
} from "@/types/contractor";

export type ContractorMatchProfile = {
  tradeIds: string[];
  tradeSlugs: string[];
  jobTypeIds: string[];
  jobTypeSlugs: string[];
  refrigerantLicense: RefrigerantLicense | null;
  electricalQualification: ElectricalQualification | null;
  lviQualifications: LviQualification[];
  servicePostalCode: string | null;
  serviceMunicipality: string | null;
  maxTravelKm: number;
};

export type ProjectMatchInput = {
  id: string;
  jobTypeId: string | null;
  jobTypeSlug: string | null;
  tradeIds: string[];
  tradeSlugs: string[];
  municipality: string;
  postalCode: string;
};

export type QualificationGap = {
  code: string;
  label: string;
  severity: "missing" | "subcontract";
};

export type ProjectMatchResult = {
  tradeMatch: boolean;
  jobTypeMatch: boolean;
  qualificationGaps: QualificationGap[];
  qualificationFit: "full" | "partial" | "none" | "na";
  distanceKm: number | null;
  withinRange: boolean;
  /** Oletusnäkymään sopiva (trade + etäisyys, ei vaadi täydellistä pätevyyttä) */
  recommended: boolean;
};

function hasLviCapability(lvi: LviQualification[]): boolean {
  return lvi.some((v) => v !== "none" && v !== "subcontract");
}

function hasElectricalCapability(eq: ElectricalQualification | null): boolean {
  return Boolean(eq && eq !== "none");
}

function hasRefrigerantCapability(lic: RefrigerantLicense | null): boolean {
  return Boolean(lic && lic !== "none");
}

function isHeatPumpJob(slug: string | null): boolean {
  return Boolean(slug && (HEAT_PUMP_JOB_SLUGS as readonly string[]).includes(slug));
}

function tradeRequiresElectrical(tradeSlugs: string[]): boolean {
  return tradeSlugs.includes("sahko");
}

function tradeRequiresLvi(tradeSlugs: string[]): boolean {
  return tradeSlugs.some((s) => ["putki", "iv", "laatoitus"].includes(s));
}

export function evaluateQualificationGaps(
  contractor: ContractorMatchProfile,
  project: ProjectMatchInput,
): QualificationGap[] {
  const gaps: QualificationGap[] = [];
  const projectTrades = project.tradeSlugs;

  if (isHeatPumpJob(project.jobTypeSlug)) {
    if (!hasRefrigerantCapability(contractor.refrigerantLicense)) {
      gaps.push({
        code: "refrigerant",
        label: "Kylmäainelupa",
        severity: "missing",
      });
    }
    if (contractor.electricalQualification === "subcontract") {
      gaps.push({
        code: "electrical",
        label: "Sähkö alihankkijalla",
        severity: "subcontract",
      });
    } else if (!hasElectricalCapability(contractor.electricalQualification)) {
      gaps.push({
        code: "electrical",
        label: "Sähköpätevyys",
        severity: "missing",
      });
    }
    if (contractor.lviQualifications.includes("subcontract")) {
      gaps.push({
        code: "lvi",
        label: "LVI alihankkijalla",
        severity: "subcontract",
      });
    } else if (!hasLviCapability(contractor.lviQualifications)) {
      gaps.push({
        code: "lvi",
        label: "LVI-pätevyys",
        severity: "missing",
      });
    }
    return gaps;
  }

  if (tradeRequiresElectrical(projectTrades)) {
    if (contractor.electricalQualification === "subcontract") {
      gaps.push({
        code: "electrical",
        label: "Sähkö alihankkijalla",
        severity: "subcontract",
      });
    } else if (!hasElectricalCapability(contractor.electricalQualification)) {
      gaps.push({
        code: "electrical",
        label: "Sähköpätevyys",
        severity: "missing",
      });
    }
  }

  if (tradeRequiresLvi(projectTrades)) {
    if (contractor.lviQualifications.includes("subcontract")) {
      gaps.push({
        code: "lvi",
        label: "LVI alihankkijalla",
        severity: "subcontract",
      });
    } else if (!hasLviCapability(contractor.lviQualifications)) {
      gaps.push({
        code: "lvi",
        label: "LVI-pätevyys",
        severity: "missing",
      });
    }
  }

  return gaps;
}

export function evaluateProjectMatch(
  contractor: ContractorMatchProfile,
  project: ProjectMatchInput,
  distanceKm: number | null,
): ProjectMatchResult {
  const hasProjectTrades = project.tradeIds.length > 0;
  const tradeMatch =
    !hasProjectTrades ||
    project.tradeIds.some((id) => contractor.tradeIds.includes(id));

  const jobTypeMatch =
    !project.jobTypeId ||
    contractor.jobTypeIds.includes(project.jobTypeId);

  const qualificationGaps = evaluateQualificationGaps(contractor, project);

  let qualificationFit: ProjectMatchResult["qualificationFit"] = "na";
  if (qualificationGaps.length === 0) {
    qualificationFit = tradeMatch || isHeatPumpJob(project.jobTypeSlug) ? "full" : "na";
  } else if (qualificationGaps.every((g) => g.severity === "subcontract")) {
    qualificationFit = "partial";
  } else {
    qualificationFit = "none";
  }

  const locationConfigured = Boolean(
    contractor.servicePostalCode?.trim() || contractor.serviceMunicipality?.trim(),
  );
  const withinRange =
    !locationConfigured ||
    distanceKm == null ||
    distanceKm <= contractor.maxTravelKm;

  const recommended = tradeMatch && withinRange;

  return {
    tradeMatch,
    jobTypeMatch,
    qualificationGaps,
    qualificationFit,
    distanceKm,
    withinRange,
    recommended,
  };
}

export function sortProjectsByMatch<T extends { match: ProjectMatchResult; createdAt: string }>(
  items: T[],
): T[] {
  return [...items].sort((a, b) => {
    if (a.match.recommended !== b.match.recommended) {
      return a.match.recommended ? -1 : 1;
    }
    if (a.match.qualificationFit !== b.match.qualificationFit) {
      const rank = { full: 0, partial: 1, na: 2, none: 3 };
      return rank[a.match.qualificationFit] - rank[b.match.qualificationFit];
    }
    const distA = a.match.distanceKm ?? 9999;
    const distB = b.match.distanceKm ?? 9999;
    if (distA !== distB) return distA - distB;
    return b.createdAt.localeCompare(a.createdAt);
  });
}
