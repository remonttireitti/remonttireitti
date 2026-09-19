import Link from "next/link";
import {
  AdminGridCard,
  adminGridClassName,
} from "@/components/admin/admin-grid-card";
import { formatEurosFromCents } from "@/lib/bids";
import type { ContractorDashboardOffer } from "@/lib/contractor-dashboard-server";

export function ContractorOffersTable({
  offers,
  className = "",
}: {
  offers: ContractorDashboardOffer[];
  className?: string;
}) {
  return (
    <div className={`${adminGridClassName} ${className}`.trim()}>
      {offers.map((offer) => (
        <AdminGridCard
          key={offer.id}
          id={offer.id}
          href={offer.href}
          title={offer.title}
          footer={
            <>
              <span className="font-medium">Tila:</span> {offer.statusLabel}
              {" · "}
              {offer.sourceLabel}
            </>
          }
          actions={
            offer.pdfHref && offer.pdfLabel ? (
              <Link
                href={offer.pdfHref}
                className="text-xs font-medium text-white underline-offset-2 hover:underline"
              >
                {offer.pdfLabel}
              </Link>
            ) : undefined
          }
        >
          <p>{offer.locationLabel}</p>
          <p className="font-medium text-white">
            {formatEurosFromCents(offer.amount_cents)}
          </p>
          <p className="text-white/75">
            {offer.date
              ? new Date(offer.date).toLocaleDateString("fi-FI")
              : "—"}
          </p>
        </AdminGridCard>
      ))}
    </div>
  );
}
