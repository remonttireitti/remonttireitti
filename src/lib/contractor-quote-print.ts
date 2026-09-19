import type { CalculatedLine } from "@/lib/calculators/math";
import type { ContractorQuoteRow } from "@/lib/contractor-quote-types";
import { siteConfig } from "@/lib/site-config";

/** Pakollinen alatunniste kaikissa tarjous-PDF:issä ja tulosteissa. */
export const CONTRACTOR_QUOTE_APP_ATTRIBUTION = `Tulostukseen on käytetty ${siteConfig.siteUrl.replace(/^https?:\/\//, "")}-sovellusta.`;

export const CONTRACTOR_QUOTE_VALIDITY_NOTE =
  "Tarjous on voimassa 30 päivää ellei toisin mainita. Lopullinen hinta voi muuttua, jos työn laajuus tai olosuhteet poikkeavat tarjouksen perusteista.";

export type ContractorQuoteDocumentView = {
  quote: Pick<
    ContractorQuoteRow,
    | "title"
    | "client_name"
    | "client_email"
    | "site_address"
    | "site_municipality"
    | "line_items"
    | "notes"
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
      title: "Kattoremontti – omakotitalo",
      client_name: "Matti Meikäläinen",
      client_email: "matti.meikalainen@esimerkki.fi",
      site_address: "Esimerkkikatu 12",
      site_municipality: "Espoo",
      line_items: lineItems,
      notes:
        "Hinta sisältää purun ja jätehuollon. Sähkötyöt ja luvat eivät sisälly.",
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
