import type { ContractorResponseTimeDisplay } from "@/lib/contractor-response-time";

/** Tarjous→tilaus-% näkyy luotettavasti vasta N lähetetyn tarjouksen jälkeen. */
export const BID_CONVERSION_MIN_SAMPLES = 10;

export type ContractorBidConversionProfile = {
  submittedCount: number;
  acceptedCount: number;
  conversionPercent: number | null;
  isReliable: boolean;
};

export type ContractorBidConversionDisplay =
  | {
      kind: "shown";
      percent: number;
      submittedCount: number;
    }
  | {
      kind: "building";
      sampleCount: number;
      required: number;
    }
  | { kind: "none" };

export type ContractorMarketSignals = {
  conversion: ContractorBidConversionDisplay;
  responseTime: ContractorResponseTimeDisplay;
};

export const BID_CONVERSION_BUILDING_NOTE = (
  current: number,
  required: number,
) =>
  `Tilausprosentti muodostuu luotettavasti ${required} tarjouksen jälkeen (${current}/${required}).`;

export const BID_CONVERSION_DISCLAIMER =
  "Tilausprosentti kuvaa, kuinka suuresta osasta Remonttireitin kautta lähetetyistä tarjouksista on tullut tilaus. Se ei takaa tulevaa tulosta eikä kerro työn laadusta.";

export function buildBidConversionProfile(
  submittedCount: number,
  acceptedCount: number,
): ContractorBidConversionProfile | null {
  if (submittedCount <= 0) return null;

  const conversionPercent =
    Math.round((acceptedCount / submittedCount) * 1000) / 10;

  return {
    submittedCount,
    acceptedCount,
    conversionPercent,
    isReliable: submittedCount >= BID_CONVERSION_MIN_SAMPLES,
  };
}

export function toBidConversionDisplay(
  profile: ContractorBidConversionProfile | null,
): ContractorBidConversionDisplay {
  if (!profile) return { kind: "none" };
  if (!profile.isReliable) {
    return {
      kind: "building",
      sampleCount: profile.submittedCount,
      required: BID_CONVERSION_MIN_SAMPLES,
    };
  }
  return {
    kind: "shown",
    percent: profile.conversionPercent!,
    submittedCount: profile.submittedCount,
  };
}

export function formatBidConversionLabel(percent: number): string {
  const formatted = percent.toLocaleString("fi-FI", {
    maximumFractionDigits: 1,
  });
  return `${formatted} % tarjouksista tilauksiksi`;
}
