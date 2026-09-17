import type { ReactNode } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  formatContractDateTimeFi,
  formatContractReference,
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
import { CONTRACT_STANDARD_SECTIONS } from "@/lib/contract-standard-terms";
import { formatEurosFromCents } from "@/lib/bids";
import { ACCEPTED_BID_PLATFORM_FOOTER } from "@/lib/platform-liability";

export type AcceptedBidDocumentData = {
  contractReference: string;
  bidAcceptedAt: string | null;
  project: {
    id: string;
    title: string;
    description: string;
    municipality: string;
    postal_code: string;
    address_line: string | null;
    desired_start: string | null;
    status: string;
    categoryName: string;
  };
  bid: {
    id: string;
    message: string;
    amount_cents: number;
    offers_equipment: boolean | null;
    equipment_amount_cents: number | null;
    equipment_description: string | null;
    accepted_includes_equipment: boolean | null;
    vat_included: boolean;
    estimated_days: number | null;
    scope_terms: string | null;
    offer_scope: string | null;
    contract_terms: string | null;
    warranty_work: string | null;
    warranty_equipment: string | null;
    earliest_start_date: string | null;
    confirms_licenses: boolean | null;
    confirms_building_standards: boolean | null;
    submitted_at: string | null;
  };
  contractor: {
    company_name: string;
    business_id: string | null;
  };
  customer: {
    full_name: string | null;
    email: string | null;
  };
  invoiceStatus: "pending" | "paid" | "cancelled" | null;
  generatedAt: string;
};

export async function loadAcceptedBidDocument(
  supabase: SupabaseClient,
  projectId: string,
  acceptedBidId: string,
): Promise<AcceptedBidDocumentData | null> {
  const { data: project } = await supabase
    .from("projects")
    .select(
      `
      id,
      customer_id,
      title,
      description,
      municipality,
      postal_code,
      address_line,
      contact_email,
      desired_start,
      status,
      bid_accepted_at,
      updated_at,
      service_categories ( name_fi )
    `,
    )
    .eq("id", projectId)
    .single();

  if (!project) return null;

  const { data: bid } = await supabase
    .from("bids")
    .select(
      `
      id,
      contractor_id,
      message,
      amount_cents,
      offers_equipment,
      equipment_amount_cents,
      equipment_description,
      accepted_includes_equipment,
      vat_included,
      estimated_days,
      scope_terms,
      offer_scope,
      contract_terms,
      warranty_work,
      warranty_equipment,
      earliest_start_date,
      confirms_licenses,
      confirms_building_standards,
      submitted_at
    `,
    )
    .eq("id", acceptedBidId)
    .eq("project_id", projectId)
    .single();

  if (!bid) return null;

  const [{ data: contractor }, { data: customer }, { data: invoice }] =
    await Promise.all([
      supabase
        .from("contractor_profiles")
        .select("company_name, business_id")
        .eq("id", bid.contractor_id)
        .single(),
      supabase
        .from("profiles")
        .select("full_name")
        .eq("id", project.customer_id)
        .maybeSingle(),
      supabase
        .from("platform_invoices")
        .select("status, created_at")
        .eq("project_id", projectId)
        .maybeSingle(),
    ]);

  const sc = project.service_categories as
    | { name_fi: string }
    | { name_fi: string }[]
    | null;
  const categoryName = Array.isArray(sc)
    ? (sc[0]?.name_fi ?? "Remontti")
    : (sc?.name_fi ?? "Remontti");

  const bidAcceptedAt =
    (project as { bid_accepted_at?: string | null }).bid_accepted_at ??
    invoice?.created_at ??
    project.updated_at ??
    null;

  return {
    contractReference: formatContractReference(project.id),
    bidAcceptedAt,
    project: {
      id: project.id,
      title: project.title,
      description: project.description,
      municipality: project.municipality,
      postal_code: project.postal_code,
      address_line: project.address_line,
      desired_start: project.desired_start,
      status: project.status,
      categoryName,
    },
    bid: {
      id: bid.id,
      message: bid.message,
      amount_cents: bid.amount_cents,
      offers_equipment: bid.offers_equipment,
      equipment_amount_cents: bid.equipment_amount_cents,
      equipment_description: bid.equipment_description,
      accepted_includes_equipment: bid.accepted_includes_equipment,
      vat_included: bid.vat_included,
      estimated_days: bid.estimated_days,
      scope_terms: bid.scope_terms,
      offer_scope: bid.offer_scope,
      contract_terms: bid.contract_terms,
      warranty_work: bid.warranty_work,
      warranty_equipment: bid.warranty_equipment,
      earliest_start_date: bid.earliest_start_date,
      confirms_licenses: bid.confirms_licenses,
      confirms_building_standards: bid.confirms_building_standards,
      submitted_at: bid.submitted_at,
    },
    contractor: {
      company_name: contractor?.company_name ?? "Urakoitsija",
      business_id: contractor?.business_id ?? null,
    },
    customer: {
      full_name: customer?.full_name ?? null,
      email: project.contact_email ?? null,
    },
    invoiceStatus:
      (invoice?.status as AcceptedBidDocumentData["invoiceStatus"]) ?? null,
    generatedAt: new Date().toISOString(),
  };
}

function DocumentRow({
  label,
  value,
  preWrap,
}: {
  label: string;
  value: ReactNode;
  preWrap?: boolean;
}) {
  if (value == null || value === "") return null;
  return (
    <div className="border-b border-stone-200 py-2.5 last:border-b-0">
      <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500">
        {label}
      </dt>
      <dd
        className={`mt-0.5 text-sm text-stone-900 ${preWrap ? "whitespace-pre-wrap" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}

export function AcceptedBidDocument({ data }: { data: AcceptedBidDocumentData }) {
  const offerScope = parseBidOfferScope(data.bid.offer_scope);
  const amountSummary = formatAcceptedBidSummary(data.bid as BidAmountParts);
  const splitEquipment = bidHasSplitEquipmentOffer(data.bid as BidAmountParts);
  const addressParts = [
    data.project.address_line?.trim(),
    `${data.project.postal_code} ${data.project.municipality}`,
  ].filter(Boolean);
  const customerName = data.customer.full_name?.trim() || "Asiakas";

  const provisional =
    data.invoiceStatus === "pending" &&
    ["bid_accepted"].includes(data.project.status);

  return (
    <article className="accepted-bid-document mx-auto max-w-3xl bg-white text-stone-900">
      <header className="border-b-2 border-stone-900 pb-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-stone-500">
          Urakkasopimus / tarjous- ja sopimusyhteenveto
        </p>
        <h1 className="mt-1 text-2xl font-bold text-stone-900">{data.project.title}</h1>
        <p className="mt-1 text-sm text-stone-600">{data.project.categoryName}</p>
        <dl className="mt-3 grid gap-1 text-sm text-stone-700 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              Sopimusnumero
            </dt>
            <dd className="font-medium">{data.contractReference}</dd>
          </div>
          {data.bidAcceptedAt && (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                Hyväksyntä (sopimuksen syntyminen)
              </dt>
              <dd className="font-medium">
                {formatContractDateTimeFi(data.bidAcceptedAt)}
              </dd>
            </div>
          )}
        </dl>
        {provisional && (
          <p className="mt-3 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Tilaus odottaa viimeistelyä: urakoitsija maksaa välityspalkkion ennen kuin
            yhteystiedot avautuvat. Sopimus on kuitenkin syntynyt hyväksynnällä — tämä
            yhteenveto heijastaa hyväksyttyä tarjousta.
          </p>
        )}
      </header>

      <section className="mt-6 grid gap-6 sm:grid-cols-2">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-stone-700">
            Asiakas (tilaaja)
          </h2>
          <dl className="mt-2">
            <DocumentRow label="Nimi" value={customerName} />
            <DocumentRow label="Sähköposti" value={data.customer.email} />
          </dl>
        </div>
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-stone-700">
            Urakoitsija (toimittaja)
          </h2>
          <dl className="mt-2">
            <DocumentRow label="Yritys" value={data.contractor.company_name} />
            <DocumentRow label="Y-tunnus" value={data.contractor.business_id} />
          </dl>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-bold uppercase tracking-wide text-stone-700">
          Kohde
        </h2>
        <dl className="mt-2">
          <DocumentRow label="Osoite" value={addressParts.join(", ") || "—"} />
          {data.project.desired_start && (
            <DocumentRow
              label="Toivottu aloitus"
              value={formatBidDate(data.project.desired_start)}
            />
          )}
        </dl>
      </section>

      <section className="mt-6 rounded-lg border border-stone-300 bg-stone-50 p-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-stone-700">
          Hyväksytty tarjous
        </h2>
        <p className="mt-2 text-2xl font-bold text-stone-900">{amountSummary}</p>
        <p className="mt-1 text-sm text-stone-600">
          {data.bid.vat_included ? "Sis. ALV" : "ALV erikseen"}
          {splitEquipment && data.bid.accepted_includes_equipment != null && (
            <> · {formatBidAcceptScopeShort(data.bid.accepted_includes_equipment)}</>
          )}
        </p>
        <dl className="mt-4">
          {data.bid.submitted_at && (
            <DocumentRow
              label="Tarjous jätetty"
              value={formatBidDate(data.bid.submitted_at.slice(0, 10))}
            />
          )}
          {data.bid.earliest_start_date && (
            <DocumentRow
              label="Ensimmäinen toteutuspäivä"
              value={formatBidDate(data.bid.earliest_start_date)}
            />
          )}
          {data.bid.estimated_days != null && data.bid.estimated_days > 0 && (
            <DocumentRow
              label="Arvioitu kesto"
              value={`${data.bid.estimated_days} päivää`}
            />
          )}
          {offerScope && (
            <DocumentRow
              label="Tarjouksen tyyppi"
              value={BID_OFFER_SCOPE_LABELS[offerScope]}
            />
          )}
          {splitEquipment && data.bid.equipment_description && (
            <DocumentRow
              label="Laite"
              value={data.bid.equipment_description}
              preWrap
            />
          )}
          <DocumentRow label="Tarjouksen viesti" value={data.bid.message} preWrap />
          <DocumentRow label="Työn laajuus" value={data.bid.scope_terms} preWrap />
          <DocumentRow
            label="Urakoitsijan sopimusehdot"
            value={data.bid.contract_terms}
            preWrap
          />
          <DocumentRow label="Takuu työlle" value={data.bid.warranty_work} preWrap />
          <DocumentRow
            label="Takuu laitteelle"
            value={data.bid.warranty_equipment}
            preWrap
          />
          {(data.bid.confirms_licenses || data.bid.confirms_building_standards) && (
            <DocumentRow
              label="Vakuutukset"
              value={
                <ul className="list-inside list-disc space-y-0.5">
                  {data.bid.confirms_licenses && (
                    <li>Tarvittavat luvat ja pätevyydet</li>
                  )}
                  {data.bid.confirms_building_standards && (
                    <li>Rakennusvaatimukset ja hyvät rakennustavat</li>
                  )}
                </ul>
              }
            />
          )}
        </dl>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-bold uppercase tracking-wide text-stone-700">
          Työn kuvaus (tarjouspyyntö)
        </h2>
        <p className="mt-2 whitespace-pre-wrap text-sm text-stone-800">
          {data.project.description}
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-bold uppercase tracking-wide text-stone-700">
          Yhteiset liite-ehdot
        </h2>
        <p className="mt-2 text-sm text-stone-600">
          Seuraavat ehdot täydentävät hyväksyttyä tarjousta. Tarjouksen omat ehdot
          ovat ensisijaisia, jos ne poikkeavat näistä yleisistä liite-ehdoista.
        </p>
        <div className="mt-4 space-y-4">
          {CONTRACT_STANDARD_SECTIONS.map((section) => (
            <div key={section.id}>
              <h3 className="text-sm font-semibold text-stone-900">{section.title}</h3>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-stone-700">
                {section.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8 grid gap-6 border-t border-stone-200 pt-6 sm:grid-cols-2">
        <div className="rounded-lg border border-stone-200 p-4">
          <h2 className="text-xs font-bold uppercase tracking-wide text-stone-600">
            Asiakkaan hyväksyntä
          </h2>
          <p className="mt-3 text-sm font-medium text-stone-900">{customerName}</p>
          <p className="mt-1 text-xs text-stone-600">
            Hyväksytty sähköisesti Remonttireitillä
            {data.bidAcceptedAt
              ? ` ${formatContractDateTimeFi(data.bidAcceptedAt)}`
              : ""}
            .
          </p>
        </div>
        <div className="rounded-lg border border-stone-200 p-4">
          <h2 className="text-xs font-bold uppercase tracking-wide text-stone-600">
            Urakoitsijan sitoumus
          </h2>
          <p className="mt-3 text-sm font-medium text-stone-900">
            {data.contractor.company_name}
          </p>
          <p className="mt-1 text-xs text-stone-600">
            Tarjous jätetty
            {data.bid.submitted_at
              ? ` ${formatContractDateTimeFi(data.bid.submitted_at)}`
              : " Remonttireitillä"}
            . Sitoutuu tarjouksen ehtoihin hyväksynnän myötä.
          </p>
        </div>
      </section>

      <footer className="mt-8 border-t border-stone-200 pt-4 text-xs text-stone-500">
        <p>
          Yhteenveto luotu{" "}
          {new Date(data.generatedAt).toLocaleString("fi-FI", {
            dateStyle: "long",
            timeStyle: "short",
          })}
          .
        </p>
        <p className="mt-2 leading-relaxed">{ACCEPTED_BID_PLATFORM_FOOTER}</p>
        <p className="mt-2">
          Kokonaishinta hyväksynnän mukaan:{" "}
          {formatEurosFromCents(bidResolvedAmountCents(data.bid as BidAmountParts))}
        </p>
      </footer>
    </article>
  );
}
