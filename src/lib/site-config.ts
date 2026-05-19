/** Julkinen yritys- ja yhteystieto (täytä tuotannon .env / Vercel). */

function resolveSiteUrl(): string {
  const configured = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim().replace(/\/$/, "");
  if (!configured || configured.includes("vercel.app")) {
    return "https://remonttireitti.fi";
  }
  return configured;
}

export const siteConfig = {
  name: process.env.NEXT_PUBLIC_COMPANY_NAME ?? "Remonttireitti",
  legalName:
    process.env.NEXT_PUBLIC_COMPANY_LEGAL_NAME ??
    process.env.NEXT_PUBLIC_COMPANY_NAME ??
    "Remonttireitti",
  businessId: process.env.NEXT_PUBLIC_COMPANY_YTUNNUS ?? "",
  address: process.env.NEXT_PUBLIC_COMPANY_ADDRESS ?? "",
  email: process.env.NEXT_PUBLIC_COMPANY_EMAIL ?? "info@remonttireitti.fi",
  phone: process.env.NEXT_PUBLIC_COMPANY_PHONE ?? "",
  privacyEmail:
    process.env.NEXT_PUBLIC_PRIVACY_EMAIL ??
    process.env.NEXT_PUBLIC_COMPANY_EMAIL ??
    "info@remonttireitti.fi",
  siteUrl: resolveSiteUrl(),
  gaId: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "",
} as const;
