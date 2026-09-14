export type PlatformFeedbackGuestUsage = "used_service" | "browsed_only";

export const guestUsageLabels: Record<PlatformFeedbackGuestUsage, string> = {
  used_service: "Käytin palvelua",
  browsed_only: "Vain selasin sivustoa",
};

export function parseGuestUsageContext(
  value: FormDataEntryValue | null,
): PlatformFeedbackGuestUsage | null {
  const raw = String(value ?? "").trim();
  if (raw === "used_service" || raw === "browsed_only") return raw;
  return null;
}
