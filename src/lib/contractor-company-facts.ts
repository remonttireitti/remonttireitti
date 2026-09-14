export type CompanySizeBand = "under_10" | "10_50" | "51_100" | "over_100";

export const COMPANY_SIZE_BAND_OPTIONS: {
  value: CompanySizeBand;
  label: string;
}[] = [
  { value: "under_10", label: "Alle 10 työntekijää" },
  { value: "10_50", label: "10–50 työntekijää" },
  { value: "51_100", label: "51–100 työntekijää" },
  { value: "over_100", label: "Yli 100 työntekijää" },
];

/** Uusien tarjousten pakollisuus alkaa (UTC). Olemassa oleville siirtymäaika. */
export const COMPANY_FACTS_ENFORCEMENT_START = new Date("2026-09-27T00:00:00.000Z");

export type ContractorCompanyFacts = {
  founded_year: number | null;
  company_size_band: CompanySizeBand | null;
};

export function companyFactsEnforcementActive(now = new Date()): boolean {
  return now >= COMPANY_FACTS_ENFORCEMENT_START;
}

export function parseCompanySizeBand(raw: unknown): CompanySizeBand | null {
  const v = String(raw ?? "").trim();
  if (v === "under_10" || v === "10_50" || v === "51_100" || v === "over_100") {
    return v;
  }
  return null;
}

export function parseFoundedYear(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const v = Number(raw);
  if (!Number.isInteger(v)) return null;
  const currentYear = new Date().getFullYear();
  if (v < 1900 || v > currentYear) return null;
  return v;
}

export function isCompanyFactsComplete(
  facts: ContractorCompanyFacts | null | undefined,
): boolean {
  if (!facts) return false;
  return facts.founded_year != null && facts.company_size_band != null;
}

export function formatFoundedYearDisplay(
  foundedYear: number | null | undefined,
): string | null {
  if (foundedYear == null) return null;
  const years = new Date().getFullYear() - foundedYear;
  if (years <= 0) return `Perustettu ${foundedYear}`;
  return `Perustettu ${foundedYear} (${years} v)`;
}

export function formatCompanySizeBandDisplay(
  band: CompanySizeBand | null | undefined,
): string | null {
  if (!band) return null;
  return COMPANY_SIZE_BAND_OPTIONS.find((o) => o.value === band)?.label ?? null;
}

export function companyFactsFromRow(row: {
  founded_year?: number | null;
  company_size_band?: string | null;
} | null): ContractorCompanyFacts {
  return {
    founded_year: row?.founded_year ?? null,
    company_size_band: parseCompanySizeBand(row?.company_size_band),
  };
}

export type ValidatedCompanyFacts = {
  founded_year: number;
  company_size_band: CompanySizeBand;
};

export function validateCompanyFactsForm(formData: FormData): {
  ok: true;
  facts: ValidatedCompanyFacts;
} | {
  ok: false;
  error: string;
} {
  const foundedYear = parseFoundedYear(formData.get("founded_year"));
  const companySizeBand = parseCompanySizeBand(formData.get("company_size_band"));

  if (foundedYear == null) {
    return { ok: false, error: "Anna yrityksen perustamisvuosi." };
  }
  if (!companySizeBand) {
    return { ok: false, error: "Valitse yrityksen koko (henkilömäärä)." };
  }

  return {
    ok: true,
    facts: { founded_year: foundedYear, company_size_band: companySizeBand },
  };
}

export function companyFactsRequiredError(): string {
  return "Täydennä yritystiedot (perustamisvuosi ja yrityksen koko) Oma tili -sivulla ennen uuden tarjouksen lähettämistä.";
}

export function companyFactsMissingMessage(): string {
  return companyFactsRequiredError();
}

export function companyFactsEnforcementDateLabel(): string {
  return COMPANY_FACTS_ENFORCEMENT_START.toLocaleDateString("fi-FI", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    timeZone: "Europe/Helsinki",
  });
}
