import type { CalculatedLine } from "@/lib/calculators/math";
import type { ContractorQuoteRow } from "@/lib/contractor-quote-types";

export const CONTRACTOR_QUOTE_VALIDITY_DAYS = 30;

export const CONTRACTOR_QUOTE_THANK_YOU =
  "Kiitos tarjouspyynnöstänne. Toivomme, että tarjouksemme vastaa tarpeitanne ja johtaa hyvään yhteistyöhön.";

export function contractorQuoteValidityNote(validityDays: number): string {
  const days = Number.isFinite(validityDays) && validityDays > 0
    ? Math.round(validityDays)
    : CONTRACTOR_QUOTE_VALIDITY_DAYS;
  return `Tarjous on voimassa ${days} päivää ellei toisin mainita. Lopullinen hinta voi muuttua, jos työn laajuus tai olosuhteet poikkeavat tarjouksen perusteista.`;
}

/** @deprecated Käytä contractorQuoteValidityNote(days) */
export const CONTRACTOR_QUOTE_VALIDITY_NOTE = contractorQuoteValidityNote(
  CONTRACTOR_QUOTE_VALIDITY_DAYS,
);

export type ContractorQuoteDocumentView = {
  quote: Pick<
    ContractorQuoteRow,
    | "id"
    | "title"
    | "client_name"
    | "client_email"
    | "site_address"
    | "site_municipality"
    | "line_items"
    | "notes"
    | "terms"
    | "validity_days"
    | "vat_included"
    | "total_cents"
    | "created_at"
  >;
  companyName: string;
  businessId: string | null;
  billingAddress: string | null;
  companyDescription: string | null;
  logoUrl?: string | null;
};

/** Tarjouksen voimassaolopäivä (luontipäivä + validityDays). */
export function quoteValidUntilDate(
  createdAt: string,
  validityDays: number = CONTRACTOR_QUOTE_VALIDITY_DAYS,
): Date {
  const d = new Date(createdAt);
  const days =
    Number.isFinite(validityDays) && validityDays > 0
      ? Math.round(validityDays)
      : CONTRACTOR_QUOTE_VALIDITY_DAYS;
  d.setDate(d.getDate() + days);
  return d;
}

/** Lyhyt tarjouksen numero tulosteeseen (UUID:n alku). */
export function quoteDisplayNumber(quoteId: string | null | undefined): string {
  if (!quoteId?.trim()) return "—";
  return quoteId.replace(/-/g, "").slice(0, 8).toUpperCase();
}

/** Admin-esikatselu: realistinen esimerkkitarjous. */
export function buildAdminSampleQuoteDocument(): ContractorQuoteDocumentView {
  const lineItems: CalculatedLine[] = [
    { id: "tyo", label: "Työt", amount: 7200, enabled: true },
    { id: "materiaalit", label: "Materiaalit", amount: 6400, enabled: true },
    { id: "lisatyot", label: "Lisätyöt", amount: 850, enabled: true },
    { id: "muut", label: "Muut kulut", amount: 350, enabled: true },
  ];
  const totalCents = 1480000;

  return {
    quote: {
      id: "sample-quote-preview",
      title: "Kattoremontti – omakotitalo",
      client_name: "Matti Meikäläinen",
      client_email: "matti.meikalainen@esimerkki.fi",
      site_address: "Esimerkkikatu 12",
      site_municipality: "Espoo",
      line_items: lineItems,
      notes:
        "Hinta sisältää purun ja jätehuollon. Sähkötyöt ja luvat eivät sisälly.",
      terms:
        "Maksuehdot: 30 % ennakkomaksu tilauksen vahvistuksessa, loppulasku valmistuttua työn.\nTyön takuu 2 vuotta.",
      validity_days: CONTRACTOR_QUOTE_VALIDITY_DAYS,
      vat_included: false,
      total_cents: totalCents,
      created_at: new Date().toISOString(),
    },
    companyName: "Esimerkki Katto Oy",
    businessId: "1234567-8",
    billingAddress: "Urakoitsijakatu 5, 02100 Espoo",
    companyDescription:
      "Paikallinen kattourakoitsija — pelti-, tiili- ja huopakatot yli 20 vuoden kokemuksella Uudellamaalla.",
    logoUrl: null,
  };
}
