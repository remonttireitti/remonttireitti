/** Vastausaika näkyy luotettavasti vasta N Remonttireitti-tarjouksen jälkeen. */
export const RESPONSE_TIME_MIN_SAMPLES = 5;

/** Maksimi vastausaika laskennassa (poistaa ääriarvot). */
export const RESPONSE_TIME_MAX_MINUTES = 30 * 24 * 60;

export type ContractorResponseTimeProfile = {
  sampleCount: number;
  medianMinutes: number;
  averageMinutes: number;
  isReliable: boolean;
};

export type ContractorResponseTimeDisplay =
  | {
      kind: "shown";
      customerLabel: string;
      detailLabel: string;
      medianMinutes: number;
      sampleCount: number;
    }
  | {
      kind: "building";
      sampleCount: number;
      required: number;
    }
  | { kind: "none" };

export const RESPONSE_TIME_BUILDING_NOTE = (
  current: number,
  required: number,
) =>
  `Vastausaika muodostuu luotettavasti ${required} tarjouksen jälkeen (${current}/${required}).`;

const RESPONSE_TIME_BUCKETS_MINUTES = [
  30, 60, 120, 180, 240, 360, 480, 720, 1440, 2880,
];

export function minutesBetween(
  publishedAt: string,
  submittedAt: string,
): number | null {
  const start = Date.parse(publishedAt);
  const end = Date.parse(submittedAt);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  const diffMs = end - start;
  if (diffMs < 0) return null;
  return diffMs / 60_000;
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1]! + sorted[mid]!) / 2;
  }
  return sorted[mid]!;
}

export function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function formatResponseDuration(minutes: number): string {
  const totalMinutes = Math.round(minutes);
  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (mins === 0) {
    return `${hours} h`;
  }
  return `${hours} h ${mins} min`;
}

export function bucketResponseMinutesForCustomer(minutes: number): number {
  for (const bucket of RESPONSE_TIME_BUCKETS_MINUTES) {
    if (minutes <= bucket) return bucket;
  }
  return RESPONSE_TIME_BUCKETS_MINUTES.at(-1)!;
}

export function formatCustomerResponseLabel(minutes: number): string {
  const bucket = bucketResponseMinutesForCustomer(minutes);
  if (bucket < 60) {
    return `vastaa yleensä ${bucket} min sisällä`;
  }
  const hours = bucket / 60;
  if (hours === 1) {
    return "vastaa yleensä 1 h sisällä";
  }
  if (Number.isInteger(hours)) {
    return `vastaa yleensä ${hours} h sisällä`;
  }
  return `vastaa yleensä ${formatResponseDuration(bucket)} sisällä`;
}

export function buildResponseTimeProfile(
  minutes: number[],
): ContractorResponseTimeProfile | null {
  const filtered = minutes.filter(
    (m) => m >= 0 && m <= RESPONSE_TIME_MAX_MINUTES,
  );
  if (filtered.length === 0) return null;

  const medianMinutes = median(filtered);
  const averageMinutes = average(filtered);

  return {
    sampleCount: filtered.length,
    medianMinutes,
    averageMinutes,
    isReliable: filtered.length >= RESPONSE_TIME_MIN_SAMPLES,
  };
}

export function toResponseTimeDisplay(
  profile: ContractorResponseTimeProfile | null,
): ContractorResponseTimeDisplay {
  if (!profile) return { kind: "none" };
  if (!profile.isReliable) {
    return {
      kind: "building",
      sampleCount: profile.sampleCount,
      required: RESPONSE_TIME_MIN_SAMPLES,
    };
  }
  return {
    kind: "shown",
    customerLabel: formatCustomerResponseLabel(profile.medianMinutes),
    detailLabel: `Keskimääräinen vastausaika ${formatResponseDuration(profile.averageMinutes)}`,
    medianMinutes: profile.medianMinutes,
    sampleCount: profile.sampleCount,
  };
}
