import type { ContractorQuoteDocumentView } from "@/lib/contractor-quote-print";
import type { ContractorQuoteRow } from "@/lib/contractor-quote-types";

export type ContractorQuotePdfData = ContractorQuoteDocumentView & {
  logoDataUri?: string | null;
};

export function contractorQuotePdfDataFromRow(
  row: ContractorQuoteRow,
  company: Omit<ContractorQuoteDocumentView, "quote"> & {
    logoDataUri?: string | null;
  },
): ContractorQuotePdfData {
  return {
    quote: row,
    companyName: company.companyName,
    businessId: company.businessId,
    billingAddress: company.billingAddress,
    companyDescription: company.companyDescription,
    logoUrl: company.logoUrl,
    logoDataUri: company.logoDataUri,
  };
}
