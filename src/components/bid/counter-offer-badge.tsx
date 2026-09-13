import {
  counterOfferBadgeClass,
  counterOfferStatusLabels,
  type CounterOfferStatus,
} from "@/lib/bid-counter-offer";

export function CounterOfferBadge({
  status,
}: {
  status: CounterOfferStatus;
}) {
  return (
    <span
      className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${counterOfferBadgeClass(status)}`}
    >
      {counterOfferStatusLabels[status]}
    </span>
  );
}
