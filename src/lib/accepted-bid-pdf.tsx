import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import {
  formatContractDateTimeFi,
} from "@/lib/accepted-bid-contract";
import {
  bidHasSplitEquipmentOffer,
  bidResolvedAmountCents,
  formatAcceptedBidSummary,
  formatBidAcceptScopeShort,
  type BidAmountParts,
} from "@/lib/bid-accept-scope";
import { formatBidDate } from "@/lib/bid-terms";
import {
  BID_OFFER_SCOPE_LABELS,
  parseBidOfferScope,
} from "@/lib/bid-offer-scope";
import type { AcceptedBidDocumentData } from "@/lib/accepted-bid-document";
import { CONTRACT_STANDARD_SECTIONS } from "@/lib/contract-standard-terms";
import { formatEurosFromCents } from "@/lib/bids";
import { ACCEPTED_BID_PLATFORM_FOOTER } from "@/lib/platform-liability";

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
  h1: { fontSize: 18, fontWeight: 700, marginTop: 4 },
  h2: {
    fontSize: 11,
    fontWeight: 700,
    marginTop: 14,
    marginBottom: 6,
    textTransform: "uppercase",
    color: "#44403c",
  },
  h3: { fontSize: 10, fontWeight: 700, marginTop: 8, marginBottom: 4 },
  muted: { color: "#57534e", fontSize: 9 },
  row: { marginBottom: 6 },
  box: {
    marginTop: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "#d6d3d1",
    backgroundColor: "#fafaf9",
  },
  twoCol: { flexDirection: "row", gap: 16, marginTop: 8 },
  col: { flex: 1 },
  section: { marginTop: 10 },
  footer: {
    marginTop: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#e7e5e4",
    fontSize: 8,
    color: "#78716c",
  },
  signatureBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e7e5e4",
    padding: 10,
    marginTop: 8,
  },
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

function AcceptedBidPdfDocument({ data }: { data: AcceptedBidDocumentData }) {
  const offerScope = parseBidOfferScope(data.bid.offer_scope);
  const amountSummary = formatAcceptedBidSummary(data.bid as BidAmountParts);
  const splitEquipment = bidHasSplitEquipmentOffer(data.bid as BidAmountParts);
  const customerName = data.customer.full_name?.trim() || "Asiakas";
  const addressParts = [
    data.project.address_line?.trim(),
    `${data.project.postal_code} ${data.project.municipality}`,
  ].filter(Boolean);

  return (
    <Document title={`Urakkasopimus ${data.contractReference}`}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.label}>Urakkasopimus / tarjous- ja sopimusyhteenveto</Text>
        <Text style={styles.h1}>{data.project.title}</Text>
        <Text style={styles.muted}>{data.project.categoryName}</Text>

        <View style={[styles.twoCol, { marginTop: 12 }]}>
          <View style={styles.col}>
            <Text style={styles.label}>Sopimusnumero</Text>
            <Text>{data.contractReference}</Text>
          </View>
          {data.bidAcceptedAt ? (
            <View style={styles.col}>
              <Text style={styles.label}>Hyväksyntä</Text>
              <Text>{formatContractDateTimeFi(data.bidAcceptedAt)}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.twoCol}>
          <View style={styles.col}>
            <Text style={styles.h2}>Asiakas</Text>
            <PdfRow label="Nimi" value={customerName} />
            <PdfRow label="Sähköposti" value={data.customer.email} />
          </View>
          <View style={styles.col}>
            <Text style={styles.h2}>Urakoitsija</Text>
            <PdfRow label="Yritys" value={data.contractor.company_name} />
            <PdfRow label="Y-tunnus" value={data.contractor.business_id} />
          </View>
        </View>

        <Text style={styles.h2}>Kohde</Text>
        <PdfRow label="Osoite" value={addressParts.join(", ") || "—"} />
        {data.project.desired_start ? (
          <PdfRow
            label="Toivottu aloitus"
            value={formatBidDate(data.project.desired_start)}
          />
        ) : null}

        <View style={styles.box}>
          <Text style={styles.h2}>Hyväksytty tarjous</Text>
          <Text style={{ fontSize: 16, fontWeight: 700 }}>{amountSummary}</Text>
          <Text style={styles.muted}>
            {data.bid.vat_included ? "Sis. ALV" : "ALV erikseen"}
            {splitEquipment && data.bid.accepted_includes_equipment != null
              ? ` · ${formatBidAcceptScopeShort(data.bid.accepted_includes_equipment)}`
              : ""}
          </Text>
          {data.bid.submitted_at ? (
            <PdfRow
              label="Tarjous jätetty"
              value={formatBidDate(data.bid.submitted_at.slice(0, 10))}
            />
          ) : null}
          {data.bid.earliest_start_date ? (
            <PdfRow
              label="Ensimmäinen toteutuspäivä"
              value={formatBidDate(data.bid.earliest_start_date)}
            />
          ) : null}
          {data.bid.estimated_days != null && data.bid.estimated_days > 0 ? (
            <PdfRow label="Arvioitu kesto" value={`${data.bid.estimated_days} päivää`} />
          ) : null}
          {offerScope ? (
            <PdfRow
              label="Tarjouksen tyyppi"
              value={BID_OFFER_SCOPE_LABELS[offerScope]}
            />
          ) : null}
          {splitEquipment && data.bid.equipment_description ? (
            <PdfRow label="Laite" value={data.bid.equipment_description} />
          ) : null}
          <PdfRow label="Tarjouksen viesti" value={data.bid.message} />
          <PdfRow label="Työn laajuus" value={data.bid.scope_terms} />
          <PdfRow label="Urakoitsijan sopimusehdot" value={data.bid.contract_terms} />
          <PdfRow label="Takuu työlle" value={data.bid.warranty_work} />
          <PdfRow label="Takuu laitteelle" value={data.bid.warranty_equipment} />
        </View>

        <Text style={styles.h2}>Työn kuvaus (tarjouspyyntö)</Text>
        <Text>{data.project.description}</Text>
      </Page>

      <Page size="A4" style={styles.page}>
        <Text style={styles.h2}>Yhteiset liite-ehdot</Text>
        <Text style={styles.muted}>
          Seuraavat ehdot täydentävät hyväksyttyä tarjousta. Tarjouksen omat ehdot ovat
          ensisijaisia, jos ne poikkeavat näistä yleisistä liite-ehdoista.
        </Text>
        {CONTRACT_STANDARD_SECTIONS.map((section) => (
          <View key={section.id} style={styles.section}>
            <Text style={styles.h3}>{section.title}</Text>
            <Text>{section.body}</Text>
          </View>
        ))}

        <View style={styles.twoCol}>
          <View style={styles.signatureBox}>
            <Text style={styles.label}>Asiakkaan hyväksyntä</Text>
            <Text style={{ fontWeight: 700, marginTop: 6 }}>{customerName}</Text>
            <Text style={styles.muted}>
              Hyväksytty sähköisesti Remonttireitillä
              {data.bidAcceptedAt
                ? ` ${formatContractDateTimeFi(data.bidAcceptedAt)}`
                : ""}
              .
            </Text>
          </View>
          <View style={styles.signatureBox}>
            <Text style={styles.label}>Urakoitsijan sitoumus</Text>
            <Text style={{ fontWeight: 700, marginTop: 6 }}>
              {data.contractor.company_name}
            </Text>
            <Text style={styles.muted}>
              Tarjous jätetty
              {data.bid.submitted_at
                ? ` ${formatContractDateTimeFi(data.bid.submitted_at)}`
                : " Remonttireitillä"}
              .
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>
            Yhteenveto luotu{" "}
            {new Date(data.generatedAt).toLocaleString("fi-FI", {
              dateStyle: "long",
              timeStyle: "short",
            })}
            .
          </Text>
          <Text style={{ marginTop: 6 }}>{ACCEPTED_BID_PLATFORM_FOOTER}</Text>
          <Text style={{ marginTop: 6 }}>
            Kokonaishinta hyväksynnän mukaan:{" "}
            {formatEurosFromCents(bidResolvedAmountCents(data.bid as BidAmountParts))}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

export async function renderAcceptedBidPdf(
  data: AcceptedBidDocumentData,
): Promise<Buffer> {
  const buffer = await renderToBuffer(<AcceptedBidPdfDocument data={data} />);
  return Buffer.from(buffer);
}
