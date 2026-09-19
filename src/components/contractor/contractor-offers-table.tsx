import Link from "next/link";
import {
  DataTable,
  DataTableBody,
  DataTableHeader,
  DataTableRow,
  DataTableTd,
  DataTableTh,
} from "@/components/ui/data-table";
import { formatEurosFromCents } from "@/lib/bids";
import type { ContractorDashboardOffer } from "@/lib/contractor-dashboard-server";

const offerStatusBadgeStyles: Record<
  ContractorDashboardOffer["statusTone"],
  string
> = {
  sky: "bg-sky-100 text-sky-800",
  emerald: "bg-emerald-100 text-emerald-800",
  stone: "bg-stone-100 text-stone-600",
  amber: "bg-amber-50 text-amber-900",
};

export function ContractorOffersTable({
  offers,
  className = "",
}: {
  offers: ContractorDashboardOffer[];
  className?: string;
}) {
  return (
    <DataTable minWidthClassName="min-w-[720px]" className={className}>
      <DataTableHeader>
        <DataTableTh>Tarjous</DataTableTh>
        <DataTableTh>Sijainti</DataTableTh>
        <DataTableTh>Summa</DataTableTh>
        <DataTableTh>Päivä</DataTableTh>
        <DataTableTh>Lähde</DataTableTh>
        <DataTableTh>Tila</DataTableTh>
        <DataTableTh>Toiminnot</DataTableTh>
      </DataTableHeader>
      <DataTableBody>
        {offers.map((offer) => (
          <DataTableRow key={offer.id}>
            <DataTableTd className="min-w-[10rem]">
              <Link
                href={offer.href}
                className="font-medium text-stone-900 hover:text-sky-900 hover:underline"
              >
                {offer.title}
              </Link>
            </DataTableTd>
            <DataTableTd className="whitespace-nowrap text-stone-700">
              {offer.locationLabel}
            </DataTableTd>
            <DataTableTd className="whitespace-nowrap font-medium text-stone-900">
              {formatEurosFromCents(offer.amount_cents)}
            </DataTableTd>
            <DataTableTd className="whitespace-nowrap text-stone-600">
              {offer.date
                ? new Date(offer.date).toLocaleDateString("fi-FI")
                : "—"}
            </DataTableTd>
            <DataTableTd>
              <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-600">
                {offer.sourceLabel}
              </span>
            </DataTableTd>
            <DataTableTd>
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                  offerStatusBadgeStyles[offer.statusTone]
                }`}
              >
                {offer.statusLabel}
              </span>
            </DataTableTd>
            <DataTableTd className="whitespace-nowrap">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={offer.href}
                  className="text-sm font-medium text-sky-800 hover:underline"
                >
                  Avaa
                </Link>
                {offer.pdfHref && offer.pdfLabel && (
                  <Link
                    href={offer.pdfHref}
                    className="text-sm font-medium text-emerald-800 hover:underline"
                  >
                    {offer.pdfLabel}
                  </Link>
                )}
              </div>
            </DataTableTd>
          </DataTableRow>
        ))}
      </DataTableBody>
    </DataTable>
  );
}
