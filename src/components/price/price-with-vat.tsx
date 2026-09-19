import {
  vatIncludedFromTreatment,
  vatLabel,
  type VatTreatment,
} from "@/lib/vat-label";
import { formatEurosFromCents } from "@/lib/bids";

type VatProp = VatTreatment | boolean;

export function VatLabel({
  included,
  treatment,
  className = "text-xs text-stone-500",
  inline = false,
}: {
  included?: boolean;
  treatment?: VatProp;
  className?: string;
  inline?: boolean;
}) {
  const resolved =
    treatment != null
      ? vatIncludedFromTreatment(treatment)
      : (included ?? true);

  return (
    <span className={`${inline ? "" : "mt-0.5 block"} ${className}`}>
      {vatLabel(resolved)}
    </span>
  );
}

export function PriceWithVat({
  cents,
  vatIncluded,
  treatment,
  className,
  amountClassName,
  inline = false,
}: {
  cents: number;
  vatIncluded?: boolean;
  treatment?: VatProp;
  className?: string;
  amountClassName?: string;
  inline?: boolean;
}) {
  const resolved =
    treatment != null
      ? vatIncludedFromTreatment(treatment)
      : (vatIncluded ?? true);

  if (inline) {
    return (
      <span className={className}>
        {formatEurosFromCents(cents)}{" "}
        <VatLabel included={resolved} inline className="text-xs text-stone-500" />
      </span>
    );
  }

  return (
    <span className={className}>
      <span className={amountClassName}>{formatEurosFromCents(cents)}</span>
      <VatLabel included={resolved} />
    </span>
  );
}

export function EuroPriceWithVat({
  euros,
  treatment = "included",
  className,
  amountClassName,
  inline = false,
}: {
  euros: number;
  treatment?: VatProp;
  className?: string;
  amountClassName?: string;
  inline?: boolean;
}) {
  const formatted = `${euros.toLocaleString("fi-FI")} €`;

  if (inline) {
    return (
      <span className={className}>
        {formatted}{" "}
        <VatLabel treatment={treatment} inline className="text-xs text-stone-500" />
      </span>
    );
  }

  return (
    <span className={className}>
      <span className={amountClassName}>{formatted}</span>
      <VatLabel treatment={treatment} />
    </span>
  );
}
