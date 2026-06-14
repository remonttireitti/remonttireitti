import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { brand } from "@/lib/brand-theme";
import { formatEurosFromCents } from "@/lib/bids";
import {
  ctaHrefForJobSlug,
  normalizePostalFilter,
  PRICE_ARCHIVE_MIN_SAMPLES,
} from "@/lib/price-archive";
import { fetchPriceArchivePageData } from "@/lib/price-archive-server";
import { pageMetadata } from "@/lib/seo";
import { seoDefByPath } from "@/lib/seo-pages";

const seo = seoDefByPath("/hinta-arkisto")!;

export const metadata: Metadata = pageMetadata({
  title: seo.title,
  description: seo.description,
  path: "/hinta-arkisto",
  keywords: seo.keywords,
});

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-stone-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-stone-500">{hint}</p>}
    </div>
  );
}

export default async function PriceArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ tyo?: string; postinumero?: string }>;
}) {
  const { tyo, postinumero } = await searchParams;
  const postalFilter = postinumero ? normalizePostalFilter(postinumero) : "";
  const data = await fetchPriceArchivePageData({
    jobSlug: tyo?.trim() || null,
    postalFilter: postalFilter || null,
  });

  const displayStats = data.regional?.length ? data.regional : data.national;
  const scopeLabel = data.regional?.length
    ? data.regionLabel
    : "Koko Suomi";

  return (
    <div className={brand.page}>
      <SiteHeader />
      <main className={brand.mainWide}>
        <Link href="/" className="text-sm text-sky-700 hover:underline">
          ← Etusivu
        </Link>

        <h1 className="mt-4 text-2xl font-bold sm:text-3xl">Hinta-arkisto</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600">
          Anonymisoitu yhteenveto hyväksytyistä tarjouksista Remonttireitillä.
          Hinnat perustuvat asiakkaan hyväksymiin tarjouksiin — eivät takaa
          tulevaa hintaa, mutta auttavat arvioimaan budjetin.
        </p>

        <form
          method="get"
          className={`${brand.section} mt-6 grid gap-4 p-5 sm:grid-cols-2 sm:p-6`}
        >
          <div>
            <label htmlFor="tyo" className="block text-sm font-medium text-stone-800">
              Työlaji
            </label>
            <select
              id="tyo"
              name="tyo"
              defaultValue={tyo ?? ""}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            >
              <option value="">Kaikki lämpöpumpput</option>
              {data.national.map((row) => (
                <option key={row.jobSlug} value={row.jobSlug}>
                  {row.jobName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="postinumero"
              className="block text-sm font-medium text-stone-800"
            >
              Postinumero (valinnainen)
            </label>
            <input
              id="postinumero"
              name="postinumero"
              type="text"
              inputMode="numeric"
              maxLength={5}
              defaultValue={postalFilter}
              placeholder="Esim. 33100 tai 33"
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-stone-500">
              5 numeroa = tarkka alue. 2 ensimmäistä = laajempi postinumeroalue
              (vähintään {PRICE_ARCHIVE_MIN_SAMPLES} urakkaa).
            </p>
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className={brand.btnPrimary}>
              Päivitä hinnat
            </button>
          </div>
        </form>

        {data.totalSamples === 0 ? (
          <p className={`${brand.section} mt-6 px-5 py-10 text-sm text-stone-600`}>
            Ei vielä tarpeeksi hyväksyttyjä urakoita hinta-arkistoon. Kun tarjouksia
            hyväksytään, tilastot ilmestyvät tänne automaattisesti.
          </p>
        ) : (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <StatCard
                label="Hyväksyttyjä urakoita"
                value={String(data.totalSamples)}
                hint="Lämpöpumpput yhteensä"
              />
              <StatCard
                label="Näytettävä alue"
                value={scopeLabel ?? "Koko Suomi"}
              />
              {data.selectedJob && (
                <StatCard
                  label={data.selectedJob.jobName}
                  value={formatEurosFromCents(data.selectedJob.medianCents)}
                  hint={`Mediaani · ${data.selectedJob.sampleCount} kpl · ${formatEurosFromCents(data.selectedJob.minCents)}–${formatEurosFromCents(data.selectedJob.maxCents)}`}
                />
              )}
            </div>

            {postalFilter.length >= 2 && !data.regional?.length && (
              <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                Alueella ei vielä vähintään {PRICE_ARCHIVE_MIN_SAMPLES} hyväksyttyä
                urakkaa — näytetään koko maan keskiarvot.
              </p>
            )}

            <div className="mt-8 overflow-x-auto rounded-xl border border-stone-200 bg-white">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50 text-left text-xs font-semibold uppercase tracking-wide text-stone-600">
                    <th className="px-4 py-3">Työlaji</th>
                    <th className="px-4 py-3">Urakoita</th>
                    <th className="px-4 py-3">Mediaani</th>
                    <th className="px-4 py-3">Välillä</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {displayStats.map((row) => (
                    <tr
                      key={row.jobSlug}
                      className="border-b border-stone-100 last:border-0"
                    >
                      <td className="px-4 py-3 font-medium text-stone-900">
                        {row.jobName}
                      </td>
                      <td className="px-4 py-3 text-stone-700">{row.sampleCount}</td>
                      <td className="px-4 py-3 font-semibold text-stone-900">
                        {formatEurosFromCents(row.medianCents)}
                      </td>
                      <td className="px-4 py-3 text-stone-600">
                        {formatEurosFromCents(row.minCents)} –{" "}
                        {formatEurosFromCents(row.maxCents)}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={ctaHrefForJobSlug(row.jobSlug)}
                          className="font-medium text-sky-800 hover:underline"
                        >
                          Kilpailuta →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <p className="mt-8 text-xs leading-relaxed text-stone-500">
          Hinnat sisältävät hyväksytyn tarjouksen kokonaissumman (asennus ± laite
          asiakkaan valinnan mukaan). Yksittäisiä urakoita, osoitteita tai
          henkilöitä ei näytetä. Pakollinen kuluttajansuoja ja paikalliset erot
          voivat vaikuttaa hintaan.
        </p>
      </main>
    </div>
  );
}
