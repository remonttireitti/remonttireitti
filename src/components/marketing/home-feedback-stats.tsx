import Link from "next/link";
import type { ReactNode } from "react";
import { PlatformFeedbackPanel } from "@/components/feedback/platform-feedback-panel";
import { ShareLinkPanel } from "@/components/ui/share-link-panel";
import type { PlatformFeedbackRow, PublicFeedbackStats } from "@/lib/platform-feedback-server";
import { brand } from "@/lib/brand-theme";

function Stars({ value }: { value: number }) {
  const rounded = Math.round(value);
  return (
    <span className="text-sky-600" aria-hidden>
      {"★".repeat(rounded)}
      <span className="text-stone-300">{"★".repeat(Math.max(0, 5 - rounded))}</span>
    </span>
  );
}

function StatBlock({
  label,
  value,
  sub,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white px-4 py-5 text-center shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums text-stone-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-stone-600">{sub}</p>}
    </div>
  );
}

export function HomeFeedbackStats({
  stats,
  existingFeedback,
  defaultRole,
  requireGuestEmail,
  userEmail,
}: {
  stats: PublicFeedbackStats | null;
  existingFeedback: PlatformFeedbackRow | null;
  defaultRole?: "customer" | "contractor";
  requireGuestEmail?: boolean;
  userEmail?: string | null;
}) {
  const hasStats = stats && stats.totalCount > 0;

  return (
    <section className="border-t border-violet-100 bg-gradient-to-br from-violet-50/30 via-white to-sky-50/40 py-12 sm:py-14">
      <div className={brand.containerWide}>
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-medium uppercase tracking-wide text-violet-800">
            Käyttäjäpalaute
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-stone-900">
            Mitä käyttäjät sanovat palvelusta
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-stone-600">
            Aidot arviot asiakkailta ja urakoitsijoilta — ei keinotekoisia lukemia.
            Voit vaikuttaa tilastoihin antamalla oman palautteesi.
          </p>
        </div>

        {hasStats && (
          <div className="mx-auto mt-8 grid max-w-4xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatBlock
              label="Palautteita"
              value={stats.totalCount}
              sub={`${stats.customerCount} asiakasta · ${stats.contractorCount} urakoitsijaa`}
            />
            <StatBlock
              label="Selkeys"
              value={
                <>
                  {stats.avgClarity.toFixed(1)}
                  <span className="text-base font-normal text-stone-500"> / 5</span>
                </>
              }
              sub={<Stars value={stats.avgClarity} />}
            />
            <StatBlock
              label="Käyttökokemus"
              value={
                <>
                  {stats.avgExperience.toFixed(1)}
                  <span className="text-base font-normal text-stone-500"> / 5</span>
                </>
              }
              sub={<Stars value={stats.avgExperience} />}
            />
            <StatBlock
              label="Suosittelisi"
              value={`${stats.recommendPct}%`}
            />
          </div>
        )}

        <div className="mx-auto mt-8 max-w-2xl space-y-4">
          <ShareLinkPanel
            path="/palaute"
            title="Jaa palautekysely"
            description="Kutsu muita antamaan palautetta — toimii ilman tiliä."
            label="Jaa linkki"
            compact
          />
          <PlatformFeedbackPanel
            existing={existingFeedback}
            defaultRole={defaultRole}
            compact
            requireGuestEmail={requireGuestEmail}
            userEmail={userEmail}
          />
          <p className="mt-4 text-center text-xs text-stone-500">
            Ilman tiliä? Vahvista sähköposti —{" "}
            <Link href="/palaute" className="font-medium text-sky-700 hover:underline">
              avaa laajempi palautesivu
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
