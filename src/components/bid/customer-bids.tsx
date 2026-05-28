import { ContractorTrustBanner } from "@/components/bid/contractor-trust-banner";
import { CustomerBidActions } from "@/components/bid/customer-bid-actions";
import { ValuePromoBanner } from "@/components/promo/value-promo-banner";
import { StarRatingDisplay } from "@/components/review/star-rating-display";
import { isBidStale } from "@/lib/bid-staleness";
import { formatCounterOfferStatus } from "@/lib/bid-counter-offer";
import { formatBidDate } from "@/lib/bid-terms";
import {
  bidHasSplitEquipmentOffer,
  bidResolvedAmountCents,
  formatBidAcceptScopeShort,
} from "@/lib/bid-accept-scope";
import { bidTotalAmountCents } from "@/lib/bid-amounts";
import {
  bidStatusLabels,
  formatEurosFromCents,
  getBidContractorName,
  sortBidsForComparison,
} from "@/lib/bids";
import type { ContractorRatingSummary } from "@/lib/reviews";
import type { BidStatus, ProjectStatus } from "@/types/database";

export type BidWithContractor = {
  id: string;
  contractor_id: string;
  amount_cents: number;
  offers_equipment?: boolean | null;
  equipment_amount_cents?: number | null;
  equipment_description?: string | null;
  accepted_includes_equipment?: boolean | null;
  message: string;
  status: BidStatus;
  estimated_days: number | null;
  vat_included: boolean;
  scope_terms: string | null;
  contract_terms: string | null;
  warranty_work: string | null;
  warranty_equipment: string | null;
  earliest_start_date: string | null;
  confirms_licenses: boolean | null;
  confirms_building_standards: boolean | null;
  counter_amount_cents: number | null;
  counter_message: string | null;
  counter_offered_at: string | null;
  counter_status: "pending" | "accepted" | "declined" | null;
  submitted_at: string | null;
  confirmed_content_revision: number | null;
  rejection_message: string | null;
  rejected_at: string | null;
  contractor_profiles: {
    company_name: string;
  } | { company_name: string }[] | null;
};

function ClampedText({ text }: { text: string | null | undefined }) {
  if (!text?.trim()) {
    return <span className="text-stone-400">—</span>;
  }
  if (text.length <= 100) {
    return <p className="whitespace-pre-wrap text-stone-800">{text}</p>;
  }
  return (
    <details className="group max-w-[16rem]">
      <summary className="cursor-pointer list-none whitespace-pre-wrap text-stone-800 marker:content-none">
        <span className="line-clamp-3">{text}</span>
        <span className="mt-1 block text-xs font-medium text-sky-700 group-open:hidden">
          Näytä koko teksti
        </span>
      </summary>
      <p className="mt-2 whitespace-pre-wrap text-stone-700">{text}</p>
    </details>
  );
}

function GuaranteesCell({ bid }: { bid: BidWithContractor }) {
  const items: string[] = [];
  if (bid.confirms_licenses) items.push("Luvat ja pätevyydet");
  if (bid.confirms_building_standards) items.push("Rakennusvaatimukset");
  if (items.length === 0) {
    return <span className="text-stone-400">—</span>;
  }
  return (
    <ul className="space-y-0.5 text-stone-800">
      {items.map((item) => (
        <li key={item}>✓ {item}</li>
      ))}
    </ul>
  );
}

function columnClass(status: BidStatus, pendingWinner: boolean): string {
  if (status === "accepted" || pendingWinner) {
    return "border-sky-300 bg-sky-50/80";
  }
  if (status === "rejected" || status === "withdrawn") {
    return "bg-stone-50/80 opacity-75";
  }
  return "bg-white";
}

export function CustomerBids({
  projectId,
  projectStatus,
  contentRevision,
  bids,
  contractorRatings = {},
  acceptedBidId = null,
}: {
  projectId: string;
  projectStatus: ProjectStatus;
  contentRevision: number;
  bids: BidWithContractor[];
  contractorRatings?: Record<string, ContractorRatingSummary>;
  acceptedBidId?: string | null;
}) {
  const canAccept = ["published", "receiving_bids"].includes(projectStatus);
  const finalizing =
    projectStatus === "bid_accepted" && acceptedBidId != null;
  const isPendingWinner = (bid: BidWithContractor) =>
    finalizing && bid.id === acceptedBidId && bid.status === "submitted";
  const visibleBids = bids.filter((b) => b.status !== "withdrawn");

  if (projectStatus === "draft") {
    return (
      <section className="mt-8">
        <h2 className="text-lg font-semibold">Tarjoukset</h2>
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-950">
          Pyyntö on luonnos — urakoitsijat eivät näe sitä ennen julkaisua. Julkaise
          pyyntö sivun yläosasta, jotta tarjoukset voivat saapua.
        </p>
      </section>
    );
  }

  if (projectStatus === "cancelled") {
    return (
      <p className="mt-6 rounded-lg border border-stone-200 bg-stone-50 p-4 text-sm text-stone-600">
        Tarjouspyyntö on peruttu. Saapuneet tarjoukset eivät ole enää voimassa.
      </p>
    );
  }
  const sorted = sortBidsForComparison(visibleBids);
  const showEquipmentBreakdown = sorted.some(
    (b) => b.offers_equipment && b.equipment_amount_cents,
  );
  const showScopeTerms = sorted.some((b) => b.scope_terms);
  const showContractTerms = sorted.some((b) => b.contract_terms);
  const showEquipmentWarranty = sorted.some((b) => b.warranty_equipment);
  const showCounterRow = sorted.some(
    (b) => b.counter_status && b.counter_amount_cents,
  );

  if (visibleBids.length === 0) {
    return (
      <p className="mt-6 rounded-lg bg-stone-100 p-4 text-sm text-stone-600">
        Ei vielä tarjouksia. Urakoitsijat näkevät julkaistun pyynnön listallaan.
      </p>
    );
  }

  const labelCell =
    "sticky left-0 z-10 border-r border-stone-200 bg-stone-50 px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-stone-600";
  const dataCell = "border-stone-200 px-3 py-2.5 align-top text-sm";

  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold">Tarjoukset ({visibleBids.length})</h2>
      <p className="mt-1 text-sm text-stone-500">
        {finalizing
          ? "Valittu urakoitsija viimeistelee tilausta (välitysmaksu). Muut tarjoukset säilyvät, jos valinta raukeaa määräajassa."
          : showEquipmentBreakdown
            ? "Vertaile tarjouksia sarakkeittain. Järjestys: halvin asennus ensin (laite valinnainen hyväksynnässä)."
            : "Vertaile tarjouksia sarakkeittain. Halvin hinta ensin, hyväksytty korostettuna."}
      </p>

      <ContractorTrustBanner />

      {canAccept && (
        <ValuePromoBanner variant="customer-negotiate" className="mt-4" />
      )}

      <div>
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-stone-200">
              <th className={`${labelCell} w-36`} scope="col">
                Vertailu
              </th>
              {sorted.map((bid) => {
                const company = getBidContractorName(bid.contractor_profiles);
                const rating = contractorRatings[bid.contractor_id];
                const pendingWinner = isPendingWinner(bid);
                return (
                  <th
                    key={bid.id}
                    scope="col"
                    className={`min-w-[11rem] border-l border-stone-200 px-3 py-3 text-left ${columnClass(bid.status, pendingWinner)}`}
                  >
                    <p className="font-semibold text-stone-900">{company}</p>
                    {rating && rating.count > 0 && (
                      <div className="mt-1">
                        <StarRatingDisplay
                          rating={rating.average}
                          count={rating.count}
                        />
                      </div>
                    )}
                    <span className="mt-2 inline-block rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-700">
                      {pendingWinner
                        ? "Valittu — odottaa maksua"
                        : bidStatusLabels[bid.status]}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {showEquipmentBreakdown ? (
              <>
                <tr className="border-b border-stone-100">
                  <th className={labelCell} scope="row">
                    Asennus ja työ
                  </th>
                  {sorted.map((bid) => (
                    <td
                      key={bid.id}
                      className={`${dataCell} border-l ${columnClass(bid.status, isPendingWinner(bid))}`}
                    >
                      {formatEurosFromCents(bid.amount_cents)}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-stone-100 bg-stone-50/50">
                  <th className={labelCell} scope="row">
                    Laite
                  </th>
                  {sorted.map((bid) => (
                    <td
                      key={bid.id}
                      className={`${dataCell} border-l ${columnClass(bid.status, isPendingWinner(bid))}`}
                    >
                      {bid.offers_equipment && bid.equipment_amount_cents ? (
                        <div>
                          <p className="font-medium text-stone-900">
                            {formatEurosFromCents(bid.equipment_amount_cents)}
                          </p>
                          {bid.equipment_description && (
                            <p className="mt-1 text-xs text-stone-600">
                              {bid.equipment_description}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-stone-400">—</span>
                      )}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-stone-100">
                  <th className={labelCell} scope="row">
                    Yhteensä
                  </th>
                  {sorted.map((bid) => (
                    <td
                      key={bid.id}
                      className={`${dataCell} border-l font-bold text-sky-800 ${columnClass(bid.status, isPendingWinner(bid))}`}
                    >
                      {formatEurosFromCents(bidTotalAmountCents(bid))}
                      {bid.vat_included && (
                        <span className="mt-0.5 block text-xs font-normal text-stone-500">
                          sis. ALV
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              </>
            ) : (
              <tr className="border-b border-stone-100">
                <th className={labelCell} scope="row">
                  Hinta
                </th>
                {sorted.map((bid) => (
                  <td
                    key={bid.id}
                    className={`${dataCell} border-l font-bold text-sky-800 ${columnClass(bid.status, isPendingWinner(bid))}`}
                  >
                    {formatEurosFromCents(bidTotalAmountCents(bid))}
                    {bid.vat_included && (
                      <span className="mt-0.5 block text-xs font-normal text-stone-500">
                        sis. ALV
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            )}

            <tr className="border-b border-stone-100 bg-stone-50/50">
              <th className={labelCell} scope="row">
                Aloituspäivä
              </th>
              {sorted.map((bid) => (
                <td
                  key={bid.id}
                  className={`${dataCell} border-l ${columnClass(bid.status, isPendingWinner(bid))}`}
                >
                  {bid.earliest_start_date ? (
                    formatBidDate(bid.earliest_start_date)
                  ) : (
                    <span className="text-stone-400">—</span>
                  )}
                </td>
              ))}
            </tr>

            <tr className="border-b border-stone-100">
              <th className={labelCell} scope="row">
                Kesto
              </th>
              {sorted.map((bid) => (
                <td
                  key={bid.id}
                  className={`${dataCell} border-l ${columnClass(bid.status, isPendingWinner(bid))}`}
                >
                  {bid.estimated_days != null && bid.estimated_days > 0 ? (
                    `${bid.estimated_days} pv`
                  ) : (
                    <span className="text-stone-400">—</span>
                  )}
                </td>
              ))}
            </tr>

            {showScopeTerms && (
              <tr className="border-b border-stone-100">
                <th className={labelCell} scope="row">
                  Laajuus
                </th>
                {sorted.map((bid) => (
                  <td
                    key={bid.id}
                    className={`${dataCell} border-l ${columnClass(bid.status, isPendingWinner(bid))}`}
                  >
                    <ClampedText text={bid.scope_terms} />
                  </td>
                ))}
              </tr>
            )}

            {showContractTerms && (
              <tr className="border-b border-stone-100 bg-stone-50/50">
                <th className={labelCell} scope="row">
                  Sopimusehdot
                </th>
                {sorted.map((bid) => (
                  <td
                    key={bid.id}
                    className={`${dataCell} border-l ${columnClass(bid.status, isPendingWinner(bid))}`}
                  >
                    <ClampedText text={bid.contract_terms} />
                  </td>
                ))}
              </tr>
            )}

            <tr className="border-b border-stone-100 bg-stone-50/50">
              <th className={labelCell} scope="row">
                Takuu työlle
              </th>
              {sorted.map((bid) => (
                <td
                  key={bid.id}
                  className={`${dataCell} border-l ${columnClass(bid.status, isPendingWinner(bid))}`}
                >
                  <ClampedText text={bid.warranty_work} />
                </td>
              ))}
            </tr>

            {showEquipmentWarranty && (
              <tr className="border-b border-stone-100">
                <th className={labelCell} scope="row">
                  Takuu laitteelle
                </th>
                {sorted.map((bid) => (
                  <td
                    key={bid.id}
                    className={`${dataCell} border-l ${columnClass(bid.status, isPendingWinner(bid))}`}
                  >
                    <ClampedText text={bid.warranty_equipment} />
                  </td>
                ))}
              </tr>
            )}

            <tr className="border-b border-stone-100 bg-stone-50/50">
              <th className={labelCell} scope="row">
                Vakuutukset
              </th>
              {sorted.map((bid) => (
                <td
                  key={bid.id}
                  className={`${dataCell} border-l ${columnClass(bid.status, isPendingWinner(bid))}`}
                >
                  <GuaranteesCell bid={bid} />
                </td>
              ))}
            </tr>

            {showCounterRow && (
              <tr className="border-b border-stone-100 bg-amber-50/40">
                <th className={labelCell} scope="row">
                  Vastatarjous
                </th>
                {sorted.map((bid) => (
                  <td
                    key={bid.id}
                    className={`${dataCell} border-l ${columnClass(bid.status, isPendingWinner(bid))}`}
                  >
                    {formatCounterOfferStatus(bid) ?? (
                      <span className="text-stone-400">—</span>
                    )}
                  </td>
                ))}
              </tr>
            )}

            <tr className="border-b border-stone-100">
              <th className={labelCell} scope="row">
                Viesti
              </th>
              {sorted.map((bid) => (
                <td
                  key={bid.id}
                  className={`${dataCell} border-l ${columnClass(bid.status, isPendingWinner(bid))}`}
                >
                  <ClampedText text={bid.message} />
                </td>
              ))}
            </tr>

            {(canAccept ||
              finalizing ||
              sorted.some((b) => b.status === "accepted")) && (
              <tr>
                <th className={labelCell} scope="row">
                  Toiminto
                </th>
                {sorted.map((bid) => (
                  <td
                    key={bid.id}
                    className={`${dataCell} border-l ${columnClass(bid.status, isPendingWinner(bid))}`}
                  >
                    {isPendingWinner(bid) && (
                      <p className="text-sm text-sky-800">
                        Valittu urakoitsijaksi
                        {bidHasSplitEquipmentOffer(bid) &&
                          bid.accepted_includes_equipment != null && (
                            <>
                              {" "}
                              ({formatBidAcceptScopeShort(
                                bid.accepted_includes_equipment,
                              )}
                              , {formatEurosFromCents(
                                bidResolvedAmountCents(bid),
                              )}
                              )
                            </>
                          )}
                        . Odottaa välitysmaksun maksua — yhteystiedot avautuvat
                        sen jälkeen.
                      </p>
                    )}
                    {bid.status === "accepted" && (
                      <p className="text-sm text-sky-800">
                        Hyväksytty. Yhteystiedot urakoitsijalle välitysmaksun
                        jälkeen.
                      </p>
                    )}
                    {canAccept &&
                      bid.status === "submitted" &&
                      !isPendingWinner(bid) && (
                      <CustomerBidActions
                        bidId={bid.id}
                        projectId={projectId}
                        bid={bid}
                        stale={isBidStale(bid, contentRevision)}
                      />
                    )}
                    {bid.status === "rejected" && (
                      <div className="text-xs text-stone-600">
                        <p className="font-medium text-red-800">Hylätty</p>
                        {bid.rejection_message && (
                          <p className="mt-1 whitespace-pre-wrap">
                            {bid.rejection_message}
                          </p>
                        )}
                      </div>
                    )}
                    {!canAccept &&
                      !isPendingWinner(bid) &&
                      bid.status !== "accepted" &&
                      bid.status !== "submitted" &&
                      bid.status !== "rejected" && (
                        <span className="text-stone-400">—</span>
                      )}
                  </td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {canAccept && (
        <p className="mt-3 text-xs text-stone-500">
          Voit jättää vastatarjouksen — urakoitsija hyväksyy tai hylkää sen. Lopullinen
          hyväksyntä on mahdollista vasta, kun vastatarjous on käsitelty (tai jos et ole
          jättänyt vastatarjousta).           Hyväksynnän jälkeen urakoitsija saa välityslaskun — sinulle ei tule
          Remonttireitin maksua.
        </p>
      )}
    </section>
  );
}
