import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { formatEuro } from "@/lib/calculators/math";
import {
  CONTRACTOR_QUOTE_THANK_YOU,
  contractorQuoteValidityNote,
  quoteDisplayNumber,
  quoteValidUntilDate,
} from "@/lib/contractor-quote-print";
import type { ContractorQuotePdfData } from "@/lib/contractor-quote-pdf";
import { isPdfSafeImageDataUri } from "@/lib/contractor-quote-logo-pdf";
import { quoteVatBreakdown } from "@/lib/contractor-quote-types";
import { RemonttireittiLogoPdf } from "@/lib/remonttireitti-logo-pdf";
import { vatLabel } from "@/lib/vat-label";

const colors = {
  ink: "#1c1917",
  muted: "#57534e",
  soft: "#78716c",
  sky: "#075985",
  skyBorder: "#0284c7",
  skyBg: "#e0f2fe",
  skyHeader: "#0c4a6e",
  orange: "#c2410c",
  orangeBorder: "#ea580c",
  orangeBg: "#fff7ed",
  greenBg: "#ecfdf5",
  greenBorder: "#6ee7b7",
  greenText: "#065f46",
  line: "#e7e5e4",
  stoneBg: "#fafaf9",
  white: "#ffffff",
  altRow: "#f5f5f4",
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 40,
    paddingHorizontal: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: colors.ink,
    lineHeight: 1.45,
  },
  centered: { alignItems: "center" },
  companyFallback: {
    fontSize: 16,
    fontWeight: 700,
    color: colors.skyHeader,
    textAlign: "center",
  },
  logo: {
    width: 140,
    height: 56,
    objectFit: "contain" as const,
    alignSelf: "center",
  },
  introBox: {
    marginTop: 12,
    width: "100%",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#bae6fd",
    borderTopWidth: 3,
    borderTopColor: colors.sky,
    backgroundColor: colors.skyBg,
    borderRadius: 8,
  },
  introText: { fontSize: 9, color: colors.ink, lineHeight: 1.5 },
  introMeta: { marginTop: 6, fontSize: 8, color: colors.muted },
  titleRow: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  titleMain: { flex: 1 },
  eyebrow: {
    fontSize: 8,
    textTransform: "uppercase",
    color: colors.soft,
    letterSpacing: 1,
    marginBottom: 4,
  },
  h1: { fontSize: 18, fontWeight: 700, color: colors.ink },
  metaBox: {
    width: 130,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.stoneBg,
    borderRadius: 8,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  metaLabel: { fontSize: 8, color: colors.soft },
  metaValue: { fontSize: 9, fontWeight: 700 },
  infoBlock: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#fed7aa",
    borderTopWidth: 3,
    borderTopColor: colors.orangeBorder,
    backgroundColor: colors.orangeBg,
    borderRadius: 8,
  },
  infoTitle: {
    fontSize: 8,
    fontWeight: 700,
    textTransform: "uppercase",
    color: colors.orange,
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  infoBody: { fontSize: 9, color: colors.ink, lineHeight: 1.45 },
  vatBanner: {
    marginTop: 12,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.greenBorder,
    backgroundColor: colors.greenBg,
    borderRadius: 8,
    textAlign: "center",
    fontSize: 9,
    fontWeight: 700,
    color: colors.greenText,
  },
  table: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: colors.skyHeader,
    paddingVertical: 7,
    paddingHorizontal: 8,
  },
  th: {
    fontSize: 8,
    fontWeight: 700,
    color: colors.white,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  categoryBar: {
    backgroundColor: colors.skyBg,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  categoryText: {
    fontSize: 8,
    fontWeight: 700,
    textTransform: "uppercase",
    color: colors.skyHeader,
    letterSpacing: 0.4,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  colDesc: { flex: 3.2 },
  colQty: { flex: 1, textAlign: "center" },
  colUnit: { flex: 1.3, textAlign: "right" },
  colTotal: { flex: 1.4, textAlign: "right" },
  totalsBox: {
    marginTop: 12,
    alignSelf: "flex-end",
    width: 220,
    padding: 10,
    borderWidth: 1,
    borderColor: "#fed7aa",
    backgroundColor: colors.orangeBg,
    borderRadius: 8,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  grandTotal: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#fed7aa",
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 11,
    fontWeight: 700,
  },
  notesBox: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.stoneBg,
    borderRadius: 8,
  },
  notesTitle: {
    fontSize: 8,
    fontWeight: 700,
    textTransform: "uppercase",
    color: colors.soft,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  thankYou: {
    marginTop: 22,
    textAlign: "center",
    fontSize: 9,
    fontStyle: "italic",
    color: colors.muted,
    lineHeight: 1.5,
    paddingHorizontal: 12,
  },
  signOff: {
    marginTop: 14,
    textAlign: "center",
    fontSize: 9,
    color: colors.muted,
  },
  signCompany: {
    marginTop: 4,
    textAlign: "center",
    fontSize: 10,
    fontWeight: 700,
    color: colors.ink,
  },
  footer: {
    marginTop: 18,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    fontSize: 8,
    color: colors.soft,
  },
  brandRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  brandName: { fontSize: 10, fontWeight: 700, color: "#44403c" },
  brandUrl: { fontSize: 8, color: colors.soft, marginTop: 1 },
});

export function ContractorQuotePdfDocument({
  data,
}: {
  data: ContractorQuotePdfData;
}) {
  const {
    quote,
    companyName,
    businessId,
    billingAddress,
    companyDescription,
    logoDataUri,
    logoUrl,
  } = data;
  const headerLogoSrc = [logoDataUri, logoUrl].find((c) =>
    isPdfSafeImageDataUri(c),
  ) ?? null;
  const validityDays = quote.validity_days ?? 30;
  const totalEuros = quote.total_cents / 100;
  const vat = quoteVatBreakdown(totalEuros, quote.vat_included);
  const lines = quote.line_items.filter((l) => l.enabled && l.amount > 0);
  const dateStr = new Date(quote.created_at).toLocaleDateString("fi-FI");
  const validUntilStr = quoteValidUntilDate(
    quote.created_at,
    validityDays,
  ).toLocaleDateString("fi-FI");
  const quoteNumber = quoteDisplayNumber(quote.id);

  const companyMeta = [
    companyName,
    businessId ? `Y-tunnus ${businessId}` : null,
    billingAddress,
  ]
    .filter(Boolean)
    .join(" · ");

  const customerLines = [
    quote.client_name,
    quote.client_email,
    [quote.site_address, quote.site_municipality].filter(Boolean).join(", "),
  ].filter(Boolean) as string[];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.centered}>
          {headerLogoSrc ? (
            <Image src={headerLogoSrc} style={styles.logo} />
          ) : null}
          <Text
            style={
              headerLogoSrc
                ? { ...styles.companyFallback, marginTop: 8, fontSize: 12 }
                : styles.companyFallback
            }
          >
            {companyName}
          </Text>
        </View>

        {(companyDescription || companyMeta) && (
          <View style={styles.introBox}>
            {companyDescription ? (
              <Text style={styles.introText}>{companyDescription}</Text>
            ) : null}
            {companyMeta ? (
              <Text style={styles.introMeta}>{companyMeta}</Text>
            ) : null}
          </View>
        )}

        <View style={styles.titleRow}>
          <View style={styles.titleMain}>
            <Text style={styles.eyebrow}>Tarjous</Text>
            <Text style={styles.h1}>{quote.title}</Text>
          </View>
          <View style={styles.metaBox}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Päivä</Text>
              <Text style={styles.metaValue}>{dateStr}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Voimassa</Text>
              <Text style={styles.metaValue}>{validUntilStr}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Numero</Text>
              <Text style={styles.metaValue}>{quoteNumber}</Text>
            </View>
          </View>
        </View>

        {customerLines.length > 0 && (
          <View style={styles.infoBlock}>
            <Text style={styles.infoTitle}>Asiakas</Text>
            {customerLines.map((line) => (
              <Text key={line} style={styles.infoBody}>
                {line}
              </Text>
            ))}
          </View>
        )}

        <Text style={styles.vatBanner}>
          Kaikki hinnat ovat {vatLabel(quote.vat_included)}.
        </Text>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, styles.colDesc]}>Kuvaus</Text>
            <Text style={[styles.th, styles.colQty]}>Määrä</Text>
            <Text style={[styles.th, styles.colUnit]}>A-hinta</Text>
            <Text style={[styles.th, styles.colTotal]}>Yhteensä</Text>
          </View>
          <View style={styles.categoryBar}>
            <Text style={styles.categoryText}>Työn sisältö ja hinnat</Text>
          </View>
          {lines.map((line, index) => (
            <View
              key={line.id}
              style={[
                styles.tableRow,
                { backgroundColor: index % 2 === 0 ? colors.white : colors.altRow },
              ]}
            >
              <Text style={styles.colDesc}>{line.label}</Text>
              <Text style={styles.colQty}>1 kpl</Text>
              <Text style={styles.colUnit}>{formatEuro(line.amount)}</Text>
              <Text style={styles.colTotal}>{formatEuro(line.amount)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsBox}>
          <View style={styles.totalRow}>
            <Text>Yhteensä ({vatLabel(quote.vat_included)})</Text>
            <Text>{formatEuro(vat.netEuros)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>ALV {vat.vatRate.toLocaleString("fi-FI")} %</Text>
            <Text>{formatEuro(vat.vatEuros)}</Text>
          </View>
          <View style={styles.grandTotal}>
            <Text>Tarjous yhteensä</Text>
            <Text>{formatEuro(vat.grossEuros)}</Text>
          </View>
        </View>

        {quote.notes?.trim() && (
          <View style={styles.notesBox}>
            <Text style={styles.notesTitle}>Huomiot</Text>
            <Text>{quote.notes.trim()}</Text>
          </View>
        )}

        {quote.terms?.trim() && (
          <View style={styles.notesBox}>
            <Text style={styles.notesTitle}>Ehdot</Text>
            <Text>{quote.terms.trim()}</Text>
          </View>
        )}

        <Text style={styles.thankYou}>{CONTRACTOR_QUOTE_THANK_YOU}</Text>
        <Text style={styles.signOff}>Ystävällisin terveisin</Text>
        <Text style={styles.signCompany}>{companyName}</Text>

        <View style={styles.footer}>
          <Text>{contractorQuoteValidityNote(validityDays)}</Text>
          <View style={styles.brandRow}>
            <RemonttireittiLogoPdf size={28} />
            <View>
              <Text style={styles.brandName}>Remonttireitti</Text>
              <Text style={styles.brandUrl}>remonttireitti.fi</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
