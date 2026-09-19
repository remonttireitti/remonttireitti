/** Näytä informatiivinen huomautus (≥10 %). */
export const DEVIATION_INFO_MIN_PERCENT = 10;
/** Korostettu huomautus (≥20 %). */
export const DEVIATION_WARNING_MIN_PERCENT = 20;

export type DeviationSeverity = "info" | "warning";

export type DeviationNotice = {
  severity: DeviationSeverity;
  title: string;
  body: string;
  footer: string;
  deviationPercent: number;
  estimateEuros: number;
  bidEuros: number;
  direction: "higher" | "lower";
};

export function deviationPercent(
  estimateEuros: number,
  bidEuros: number,
): number {
  if (estimateEuros <= 0 || bidEuros <= 0) return 0;
  return Math.round(((bidEuros - estimateEuros) / estimateEuros) * 1000) / 10;
}

export function formatEuros(value: number): string {
  return `${Math.round(value).toLocaleString("fi-FI")} €`;
}

export function buildDeviationNotice(
  estimateEuros: number,
  bidEuros: number,
  options?: {
    contractorAvgDeviationPercent?: number | null;
    contractorSampleCount?: number;
  },
): DeviationNotice | null {
  if (estimateEuros <= 0 || bidEuros <= 0) return null;

  const pct = deviationPercent(estimateEuros, bidEuros);
  const absPct = Math.abs(pct);
  if (absPct < DEVIATION_INFO_MIN_PERCENT) return null;

  const direction: "higher" | "lower" = pct > 0 ? "higher" : "lower";
  const severity: DeviationSeverity =
    absPct >= DEVIATION_WARNING_MIN_PERCENT ? "warning" : "info";

  const estimateLabel = formatEuros(estimateEuros);
  const bidLabel = formatEuros(bidEuros);

  let title: string;
  let body: string;
  let footer =
    "Voit lähettää tarjouksen tästä huolimatta. Remonttireitti ei arvioi hintaa oikeaksi tai vääräksi.";

  if (direction === "higher") {
    title =
      severity === "warning"
        ? "Tarjous poikkeaa laskurin arviosta"
        : "Tarkistushuomautus";
    body =
      severity === "warning"
        ? `Syöttämäsi tarjous ${bidLabel} on noin ${absPct} % korkeampi kuin laskurin arvio ${estimateLabel}. Tarkista, että kaikki työn laajuuteen, materiaaleihin ja lisätöihin vaikuttavat tiedot on huomioitu.`
        : `Tarjous ${bidLabel} on noin ${absPct} % laskennallista arviota korkeampi (${estimateLabel}). Tarkista erityisesti lisätyöt, materiaalit ja työn laajuus.`;
  } else {
    title =
      severity === "warning"
        ? "Tarjous poikkeaa selvästi laskennasta"
        : "Tarjous on alle laskennallisen arvion";
    body =
      severity === "warning"
        ? `Tarjous ${bidLabel} on noin ${absPct} % laskennallista arviota alempi (${estimateLabel}). Tarkista, että kaikki pyydetyt työt, materiaalit, matkakulut ja mahdolliset lisätyöt on huomioitu.`
        : `Tarjous ${bidLabel} on noin ${absPct} % edullisempi kuin laskurin arvio ${estimateLabel}. Tarkista, että kaikki tarvittavat työt ja materiaalit sisältyvät tarjoukseen.`;
  }

  const avg = options?.contractorAvgDeviationPercent;
  const count = options?.contractorSampleCount ?? 0;
  if (avg != null && count >= 3 && Math.abs(avg) >= 5) {
    const sign = avg > 0 ? "+" : "";
    body += ` Oma historiallinen keskipoikkeamasi tälle työlajille on noin ${sign}${Math.round(avg)} % (${count} aiempaa tarjousta).`;
  }

  return {
    severity,
    title,
    body,
    footer,
    deviationPercent: pct,
    estimateEuros,
    bidEuros,
    direction,
  };
}
