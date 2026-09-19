import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import { formatEuro } from "@/lib/calculators/math";
import { remonttireittiLogoSvgDataUri } from "@/lib/brand-logo";
import {
  CONTRACTOR_QUOTE_VALIDITY_NOTE,
  type ContractorQuoteDocumentView,
} from "@/lib/contractor-quote-print";
import { quoteVatBreakdown } from "@/lib/contractor-quote-types";
import { vatLabel } from "@/lib/vat-label";
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

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#1c1917",
    lineHeight: 1.45,
  },
  label: {
    fontSize: 8,
    textTransform: "uppercase",
    color: "#78716c",
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  h1: { fontSize: 20, fontWeight: 700, marginTop: 4 },
  h2: {
    fontSize: 11,
    fontWeight: 700,
    marginTop: 14,
    marginBottom: 6,
    textTransform: "uppercase",
    color: "#44403c",
  },
  row: { marginBottom: 6 },
  lineRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#e7e5e4",
  },
  totalsBox: {
    marginTop: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#d6d3d1",
    backgroundColor: "#fafaf9",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  grandTotal: { fontSize: 14, fontWeight: 700, marginTop: 8 },
  footer: {
    marginTop: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#e7e5e4",
    fontSize: 8,
    color: "#78716c",
  },
  muted: { color: "#57534e", fontSize: 9 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
  },
  headerMain: { flex: 1 },
  logo: { width: 120, height: 48, objectFit: "contain" as const },
  intro: { marginTop: 8, fontSize: 9, color: "#44403c", lineHeight: 1.5 },
  brandRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  brandLogo: { width: 28, height: 28 },
  brandName: { fontSize: 10, fontWeight: 700, color: "#44403c" },
});

function PdfRow({ label, value }: { label: string; value?: string | null }) {
  if (!value?.trim()) return null;
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text>{value}</Text>
    </View>
  );
}

function ContractorQuotePdfDocument({ data }: { data: ContractorQuotePdfData }) {
  const {
    quote,
    companyName,
    businessId,
    billingAddress,
    companyDescription,
    logoDataUri,
  } = data;
  const totalEuros = quote.total_cents / 100;
  const vat = quoteVatBreakdown(totalEuros, quote.vat_included);
  const lines = quote.line_items.filter((l) => l.enabled && l.amount > 0);
  const dateStr = new Date(quote.created_at).toLocaleDateString("fi-FI");

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View style={styles.headerMain}>
            <Text style={styles.label}>Tarjous</Text>
            <Text style={styles.h1}>{quote.title}</Text>
            <Text style={styles.muted}>
              {companyName}
              {businessId ? ` · Y-tunnus ${businessId}` : ""}
            </Text>
            {billingAddress && (
              <Text style={[styles.muted, { marginTop: 2 }]}>{billingAddress}</Text>
            )}
            {companyDescription && (
              <Text style={styles.intro}>{companyDescription}</Text>
            )}
          </View>
          {logoDataUri && <Image src={logoDataUri} style={styles.logo} />}
        </View>

        <View style={{ marginTop: 16 }}>
          <Text style={styles.h2}>Asiakas ja kohde</Text>
          <PdfRow label="Asiakas" value={quote.client_name} />
          <PdfRow label="Sähköposti" value={quote.client_email} />
          <PdfRow label="Kohde" value={quote.site_address} />
          <PdfRow label="Paikkakunta" value={quote.site_municipality} />
          <PdfRow label="Tarjouspäivä" value={dateStr} />
        </View>

        <View style={{ marginTop: 12 }}>
          <Text style={styles.h2}>Työn sisältö ja hinnat</Text>
          {lines.map((line) => (
            <View key={line.id} style={styles.lineRow}>
              <Text>{line.label}</Text>
              <Text>{formatEuro(line.amount)}</Text>
            </View>
          ))}
        </View>

        {quote.notes?.trim() && (
          <View style={{ marginTop: 12 }}>
            <Text style={styles.h2}>Huomiot</Text>
            <Text>{quote.notes.trim()}</Text>
          </View>
        )}

        <View style={styles.totalsBox}>
          <View style={styles.totalRow}>
            <Text>Yhteensä ({vatLabel(quote.vat_included)})</Text>
            <Text>{formatEuro(vat.netEuros)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>ALV {vat.vatRate.toLocaleString("fi-FI")} %</Text>
            <Text>{formatEuro(vat.vatEuros)}</Text>
          </View>
          <View style={[styles.totalRow, styles.grandTotal]}>
            <Text>Loppusumma</Text>
            <Text>{formatEuro(vat.grossEuros)}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>{CONTRACTOR_QUOTE_VALIDITY_NOTE}</Text>
          <View style={styles.brandRow}>
            <Image src={remonttireittiLogoSvgDataUri()} style={styles.brandLogo} />
            <Text style={styles.brandName}>Remonttireitti</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

export async function renderContractorQuotePdf(
  data: ContractorQuotePdfData,
): Promise<Buffer> {
  return renderToBuffer(<ContractorQuotePdfDocument data={data} />);
}
