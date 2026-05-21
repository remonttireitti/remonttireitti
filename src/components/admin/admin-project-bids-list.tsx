import { bidTotalAmountCents } from "@/lib/bid-amounts";
import { bidStatusLabels } from "@/lib/bids";
import type { AdminBidSummary } from "@/lib/admin-projects-server";
import type { BidStatus } from "@/types/database";

function formatWhen(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("fi-FI", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function contractorLabel(b: AdminBidSummary) {
  const name = b.company_name?.trim();
  if (name && b.contractorEmail) {
    return `${name} (${b.contractorEmail})`;
  }
  return name ?? b.contractorEmail ?? "Urakoitsija";
}

export function AdminProjectBidsList({
  bids,
  compact = false,
}: {
  bids: AdminBidSummary[];
  compact?: boolean;
}) {
  if (bids.length === 0) {
    return (
      <p className="text-sm text-stone-500">
        Ei tarjouksia{compact ? "" : " — urakoitsijat näkevät julkaistun pyynnön sivulla /tarjoukset"}.
      </p>
    );
  }

  return (
    <ul className={compact ? "space-y-2" : "space-y-3"}>
      {bids.map((b) => {
        const total = bidTotalAmountCents(b);
        const statusLabel =
          b.status in bidStatusLabels
            ? bidStatusLabels[b.status as BidStatus]
            : b.status;
        return (
          <li
            key={b.id}
            className={
              compact
                ? "rounded-lg border border-stone-100 bg-stone-50/80 px-3 py-2 text-sm"
                : "rounded-xl border border-stone-200 bg-white p-4 text-sm"
            }
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-medium text-stone-900">
                {contractorLabel(b)}
              </span>
              <span className="text-base font-semibold text-sky-900">
                {(total / 100).toLocaleString("fi-FI")} €
              </span>
            </div>
            <p className="mt-1 text-xs text-stone-500">
              Jätetty {formatWhen(b.submitted_at)} · {statusLabel}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
