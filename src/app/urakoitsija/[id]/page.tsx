import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContractorJsonLd } from "@/components/seo/contractor-json-ld";
import { ContractorMarketSignals } from "@/components/bid/contractor-market-signals";
import { ContractorQualificationsCell } from "@/components/bid/contractor-qualifications-cell";
import { BID_CONVERSION_DISCLAIMER } from "@/lib/contractor-market-profile";
import { ContractorReviewsList } from "@/components/review/contractor-reviews-list";
import { StarRatingDisplay } from "@/components/review/star-rating-display";
import { SiteHeader } from "@/components/site-header";
import { brand } from "@/lib/brand-theme";
import { pageMetadata } from "@/lib/seo";
import {
  formatCompanySizeBandDisplay,
  formatFoundedYearDisplay,
  parseCompanySizeBand,
} from "@/lib/contractor-company-facts";
import { fetchPublicContractorProfile } from "@/lib/public-contractor-server";
import {
  formatElectricalQualification,
  formatLviQualifications,
  formatRefrigerant,
  formatTrades,
} from "@/lib/format-qualifications";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const profile = await fetchPublicContractorProfile(id);
  if (!profile) {
    return pageMetadata({
      title: "Urakoitsijaa ei löydy",
      description: "Urakoitsijaprofiilia ei löytynyt.",
      path: `/urakoitsija/${id}`,
    });
  }

  const ratingText =
    profile.rating && profile.rating.count > 0
      ? ` — ${profile.rating.average.toFixed(1)}★ (${profile.rating.count})`
      : "";

  return pageMetadata({
    title: `${profile.company_name}${ratingText}`,
    description:
      profile.description?.slice(0, 155) ??
      `${profile.company_name} Remonttireitissä. Pätevyydet, arvostelut ja urakoiden määrä.`,
    path: `/urakoitsija/${id}`,
  });
}

export default async function PublicContractorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await fetchPublicContractorProfile(id);
  if (!profile) notFound();

  const quals = {
    refrigerant_license: profile.qualifications.refrigerantLicense,
    electrical_qualification: profile.qualifications.electricalQualification,
    lvi_qualifications: profile.qualifications.lviQualifications,
  };
  const foundedLabel = formatFoundedYearDisplay(profile.founded_year);
  const sizeLabel = formatCompanySizeBandDisplay(
    parseCompanySizeBand(profile.company_size_band),
  );

  return (
    <div className={brand.page}>
      <ContractorJsonLd profile={profile} />
      <SiteHeader />
      <main className={brand.mainContent}>
        <Link
          href="/"
          className="text-sm font-medium text-sky-800 hover:underline"
        >
          ← Etusivu
        </Link>

        <header className="mt-4 flex flex-wrap items-start gap-4">
          {profile.logo_url && (
            <div className="relative h-16 w-36 shrink-0 overflow-hidden rounded-xl border border-stone-200 bg-white p-2">
              <Image
                src={profile.logo_url}
                alt={`${profile.company_name} logo`}
                fill
                className="object-contain object-left"
                unoptimized
              />
            </div>
          )}
          <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-stone-900 sm:text-3xl">
            {profile.company_name}
          </h1>
          {profile.rating && profile.rating.count > 0 && (
            <div className="mt-2">
              <StarRatingDisplay
                rating={profile.rating.average}
                count={profile.rating.count}
                size="md"
              />
            </div>
          )}
          <ContractorMarketSignals
            conversion={profile.market_signals.conversion}
            responseTime={profile.market_signals.responseTime}
          />
          {(profile.market_signals.conversion.kind === "shown" ||
            profile.market_signals.responseTime.kind === "shown") && (
            <p className="mt-2 max-w-xl text-xs leading-relaxed text-stone-500">
              {BID_CONVERSION_DISCLAIMER}
            </p>
          )}
          <ul className="mt-3 flex flex-wrap gap-2 text-xs text-stone-600">
            {profile.verification_status === "verified" && (
              <li className="rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-800 ring-1 ring-emerald-200">
                Vahvistettu urakoitsija
              </li>
            )}
            {profile.completed_jobs > 0 && (
              <li className="rounded-full bg-stone-100 px-2.5 py-1">
                {profile.completed_jobs} hyväksyttyä urakkaa
              </li>
            )}
            {profile.service_municipality && (
              <li className="rounded-full bg-stone-100 px-2.5 py-1">
                Toiminta-alue: {profile.service_municipality}
                {profile.max_travel_km != null &&
                  ` (max ${profile.max_travel_km} km)`}
              </li>
            )}
            {foundedLabel && (
              <li className="rounded-full bg-stone-100 px-2.5 py-1">
                {foundedLabel}
              </li>
            )}
            {sizeLabel && (
              <li className="rounded-full bg-stone-100 px-2.5 py-1">
                {sizeLabel}
              </li>
            )}
          </ul>
          </div>
        </header>

        {profile.description?.trim() && (
          <section className={`${brand.section} mt-6 p-5 sm:p-6`}>
            <h2 className={brand.sectionTitle}>Esittely</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-stone-700">
              {profile.description}
            </p>
            {profile.website_url && (
              <p className="mt-3">
                <a
                  href={profile.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={brand.link}
                >
                  Verkkosivut →
                </a>
              </p>
            )}
          </section>
        )}

        <section className={`${brand.section} mt-6 p-5 sm:p-6`}>
          <h2 className={brand.sectionTitle}>Pätevyydet</h2>
          <div className="mt-3 space-y-2 text-sm text-stone-700">
            <p>
              <span className="font-medium">Ammatit:</span>{" "}
              {formatTrades(profile.qualifications.tradeNames)}
            </p>
            <ContractorQualificationsCell quals={quals} />
            <dl className="mt-2 space-y-1 text-xs text-stone-600">
              <div>
                <dt className="inline font-medium">Kylmäaine:</dt>{" "}
                <dd className="inline">
                  {formatRefrigerant(profile.qualifications.refrigerantLicense)}
                </dd>
              </div>
              <div>
                <dt className="inline font-medium">Sähkö:</dt>{" "}
                <dd className="inline">
                  {formatElectricalQualification(
                    profile.qualifications.electricalQualification,
                  )}
                </dd>
              </div>
              <div>
                <dt className="inline font-medium">LVI:</dt>{" "}
                <dd className="inline">
                  {formatLviQualifications(
                    profile.qualifications.lviQualifications,
                  )}
                </dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold text-stone-900">
            Arvostelut ({profile.reviews.length})
          </h2>
          <div className="mt-4">
            <ContractorReviewsList reviews={profile.reviews} />
          </div>
        </section>

        <section className="mt-10 rounded-2xl border border-sky-100 bg-sky-50/50 p-6 text-center">
          <h2 className="text-lg font-bold text-stone-900">
            Tarvitsetko remontille tekijän?
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-stone-600">
            Julkaise ilmainen tarjouspyyntö ja vertaa tarjouksia — voit myös
            neuvotella hinnasta vastatarjouksella.
          </p>
          <Link
            href="/remontti/uusi"
            className={`${brand.btnPrimary} ${brand.btnPrimaryBlock} mt-5 inline-flex`}
          >
            Aloita tarjouspyyntö
          </Link>
        </section>
      </main>
    </div>
  );
}
