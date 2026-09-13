"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getBudgetGuidance } from "@/app/actions/budget-guidance";
import type { BudgetGuidance } from "@/lib/price-archive-server";
import { formatEurosFromCents } from "@/lib/bids";
import { PRICE_ARCHIVE_JOB_SLUGS } from "@/lib/price-archive";

type Props = {
  jobSlug: string | null;
  budgetMax: string;
  postalCode?: string;
};

function budgetCompareMessage(
  budgetEuros: number,
  guidance: BudgetGuidance,
): { tone: "ok" | "low" | "high"; text: string } | null {
  const median = guidance.medianCents / 100;
  const min = guidance.minCents / 100;
  const max = guidance.maxCents / 100;

  if (budgetEuros < min * 0.85) {
    return {
      tone: "low",
      text: `Hintatoive on selvästi alle tyypillisen (${formatEurosFromCents(guidance.minCents)}–${formatEurosFromCents(guidance.maxCents)}). Saatat saada vähemmän tarjouksia.`,
    };
  }
  if (budgetEuros > max * 1.15) {
    return {
      tone: "high",
      text: `Hintatoive on korkeampi kuin useimmat hyväksytyt tarjoukset (mediaani ${formatEurosFromCents(guidance.medianCents)}).`,
    };
  }
  if (budgetEuros >= min && budgetEuros <= max) {
    return {
      tone: "ok",
      text: `Hintatoive on tyypillisen vaihtelun sisällä (mediaani ${formatEurosFromCents(guidance.medianCents)}).`,
    };
  }
  if (Math.abs(budgetEuros - median) / median <= 0.2) {
    return {
      tone: "ok",
      text: `Lähellä mediaania (${formatEurosFromCents(guidance.medianCents)}).`,
    };
  }
  return null;
}

export function BudgetGuidancePanel({ jobSlug, budgetMax, postalCode }: Props) {
  const [guidance, setGuidance] = useState<BudgetGuidance | null>(null);
  const [loading, setLoading] = useState(false);

  const slugSupported =
    jobSlug != null &&
    (PRICE_ARCHIVE_JOB_SLUGS as readonly string[]).includes(jobSlug);

  useEffect(() => {
    if (!slugSupported || !jobSlug) {
      setGuidance(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void getBudgetGuidance(jobSlug, postalCode?.trim() || null).then((data) => {
      if (!cancelled) {
        setGuidance(data);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [jobSlug, postalCode, slugSupported]);

  if (!slugSupported) return null;
  if (loading && !guidance) {
    return (
      <p className="text-xs text-stone-500" aria-live="polite">
        Haetaan hinta-arviota…
      </p>
    );
  }
  if (!guidance) return null;

  const budgetNum = Number(budgetMax);
  const compare =
    budgetMax.trim() && Number.isFinite(budgetNum) && budgetNum > 0
      ? budgetCompareMessage(budgetNum, guidance)
      : null;

  const scopeLabel =
    guidance.scope === "regional" && guidance.regionLabel
      ? guidance.regionLabel
      : "Koko Suomi";

  return (
    <aside className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-sm">
      <p className="font-semibold text-emerald-950">Hinta-arvio budjetin tueksi</p>
      <p className="mt-1 text-xs leading-relaxed text-emerald-900">
        Perustuu {guidance.sampleCount} hyväksyttyyn tarjoukseen Remonttireitillä (
        {scopeLabel}). Ei takaa tulevaa hintaa.
      </p>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-white/80 px-2 py-2">
          <dt className="text-[10px] font-medium uppercase text-stone-500">Alin</dt>
          <dd className="text-sm font-semibold text-stone-900">
            {formatEurosFromCents(guidance.minCents)}
          </dd>
        </div>
        <div className="rounded-lg bg-white/80 px-2 py-2 ring-1 ring-emerald-300">
          <dt className="text-[10px] font-medium uppercase text-emerald-700">Mediaani</dt>
          <dd className="text-sm font-bold text-emerald-950">
            {formatEurosFromCents(guidance.medianCents)}
          </dd>
        </div>
        <div className="rounded-lg bg-white/80 px-2 py-2">
          <dt className="text-[10px] font-medium uppercase text-stone-500">Ylin</dt>
          <dd className="text-sm font-semibold text-stone-900">
            {formatEurosFromCents(guidance.maxCents)}
          </dd>
        </div>
      </dl>
      {compare && (
        <p
          className={`mt-3 rounded-lg px-3 py-2 text-xs ${
            compare.tone === "ok"
              ? "bg-emerald-100/80 text-emerald-950"
              : compare.tone === "low"
                ? "bg-amber-100/80 text-amber-950"
                : "bg-sky-100/80 text-sky-950"
          }`}
          role="status"
        >
          {compare.text}
        </p>
      )}
      <p className="mt-3 text-xs text-emerald-900">
        <Link href={`/hinta-arkisto?tyo=${guidance.jobSlug}`} className="font-medium hover:underline">
          Katso koko hinta-arkisto →
        </Link>
      </p>
    </aside>
  );
}
