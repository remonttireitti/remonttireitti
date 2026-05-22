import { formatBidDate } from "@/lib/bid-terms";

export type BidDetailsView = {
  scope_terms?: string | null;
  contract_terms?: string | null;
  warranty_work?: string | null;
  warranty_equipment?: string | null;
  earliest_start_date?: string | null;
  estimated_days?: number | null;
  confirms_licenses?: boolean | null;
  confirms_building_standards?: boolean | null;
};

export function BidDetailsDisplay({ bid }: { bid: BidDetailsView }) {
  const hasTerms =
    bid.warranty_work ||
    bid.warranty_equipment ||
    bid.earliest_start_date ||
    bid.confirms_licenses ||
    bid.confirms_building_standards;

  if (!hasTerms) return null;

  return (
    <dl className="mt-4 space-y-3 border-t border-stone-100 pt-4 text-sm">
      {bid.earliest_start_date && (
        <div>
          <dt className="font-medium text-stone-600">
            Ensimmäinen mahdollinen toteutuspäivä
          </dt>
          <dd className="mt-0.5 text-stone-800">
            {formatBidDate(bid.earliest_start_date)}
          </dd>
        </div>
      )}
      {bid.estimated_days != null && bid.estimated_days > 0 && (
        <div>
          <dt className="font-medium text-stone-600">Arvioitu kesto</dt>
          <dd className="mt-0.5 text-stone-800">{bid.estimated_days} päivää</dd>
        </div>
      )}
      {bid.scope_terms && (
        <div>
          <dt className="font-medium text-stone-600">Asennuksen laajuus</dt>
          <dd className="mt-0.5 whitespace-pre-wrap text-stone-800">
            {bid.scope_terms}
          </dd>
        </div>
      )}
      {bid.contract_terms && (
        <div>
          <dt className="font-medium text-stone-600">Sopimusehdot</dt>
          <dd className="mt-0.5 whitespace-pre-wrap text-stone-800">
            {bid.contract_terms}
          </dd>
        </div>
      )}
      {bid.warranty_work && (
        <div>
          <dt className="font-medium text-stone-600">Takuu työlle</dt>
          <dd className="mt-0.5 whitespace-pre-wrap text-stone-800">
            {bid.warranty_work}
          </dd>
        </div>
      )}
      {bid.warranty_equipment && (
        <div>
          <dt className="font-medium text-stone-600">Takuu laitteelle</dt>
          <dd className="mt-0.5 whitespace-pre-wrap text-stone-800">
            {bid.warranty_equipment}
          </dd>
        </div>
      )}
      {(bid.confirms_licenses || bid.confirms_building_standards) && (
        <div>
          <dt className="font-medium text-stone-600">Vakuutukset</dt>
          <dd className="mt-1 space-y-1 text-stone-700">
            {bid.confirms_licenses && (
              <p>✓ Tarvittavat luvat ja pätevyydet</p>
            )}
            {bid.confirms_building_standards && (
              <p>✓ Rakennusvaatimukset ja hyvät rakennustavat</p>
            )}
          </dd>
        </div>
      )}
    </dl>
  );
}
