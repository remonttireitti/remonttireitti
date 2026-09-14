import { createHash, randomBytes } from "crypto";

export function hashFeedbackVerificationToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

export function generateFeedbackVerificationToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString("base64url");
  return { raw, hash: hashFeedbackVerificationToken(raw) };
}

export function normalizeFeedbackEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidFeedbackEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
