import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/admin-nav";
import { LearnedProposalsAdminPanel } from "@/components/admin/learned-proposals-admin-panel";
import { SiteHeader } from "@/components/site-header";
import { requireAdmin } from "@/lib/admin";
import { fetchJobDeviationStatsAdmin } from "@/lib/calculator-deviation-server";
import { LEARNED_RANGE_MIN_SAMPLES } from "@/lib/calculator-range-learning";
import { fetchAllLearnedProposalsAdmin } from "@/lib/learned-proposals-admin";
import { getSessionUser } from "@/lib/auth";
import { brand } from "@/lib/brand-theme";
import { createClient } from "@/lib/supabase/server";

function formatEuros(cents: number): string {
  return `${Math.round(cents / 100).toLocaleString("fi-FI")} €`;
}

export default async function AdminLearningPage() {
  const user = await getSessionUser();
  if (!user) redirect("/kirjaudu?redirect=/admin/oppiminen");

  await requireAdmin();

  const supabase = await createClient();
  const [proposals, deviationStats, learnedRangesResult] = await Promise.all([
    fetchAllLearnedProposalsAdmin(supabase),
    fetchJobDeviationStatsAdmin(supabase),
    supabase
      .from("calculator_learned_ranges")
      .select(
        "calculator_slug, job_slug, low_multiplier, high_multiplier, median_deviation_percent, sample_count, updated_at",
      )
      .gte("sample_count", LEARNED_RANGE_MIN_SAMPLES)
      .order("sample_count", { ascending: false })
      .limit(50),
  ]);
  const learnedRanges = learnedRangesResult.data ?? [];

  return (
    <div className={brand.page}>
      <SiteHeader />
      <main className={brand.mainWide}>
        <Link href="/admin" className="text-sm text-sky-700 hover:underline">
          ← Ylläpito
        </Link>
        <h1 className="mt-4 text-2xl font-bold">Oppiva laskuri ja tarjousmoottori</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-stone-600">
          Urakoitsijoiden ehdotukset lisätöistä ja puuttuvista tiedoista sekä
          tarjous–laskuri-poikkeamat. Yksittäinen ehdotus ei muuta laskuria —
          hyväksy toistuvat havainnot kategoriakohtaisesti.
        </p>
        <AdminNav current="/admin/oppiminen" />

        <section className="mt-8">
          <h2 className="text-lg font-semibold text-stone-900">
            Ehdotukset tarjouspyyntöihin
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            Hyväksytyt lisätyöt näkyvät asiakkaalle valintoina. Hylätyt eivät
            nouse näkyviin.
          </p>
          <div className="mt-4">
            <LearnedProposalsAdminPanel proposals={proposals} />
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-stone-900">
            Tarjous vs. laskuri -poikkeamat
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            Aggregoitu data tarjouksista ja valmiista urakoista. Kun näytteitä
            on vähintään {LEARNED_RANGE_MIN_SAMPLES}, laskurin hintahaarukka
            päivittyy automaattisesti.
          </p>
          {deviationStats.length === 0 ? (
            <p className="mt-4 rounded-xl border border-stone-200 bg-white p-6 text-sm text-stone-600">
              Ei vielä tallennettuja poikkeamia. Data kertyy, kun urakoitsijat
              käyttävät tarjouslaskuria ja lähettävät tarjouksen.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-xl border border-stone-200 bg-white">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-100 text-left text-xs uppercase tracking-wide text-stone-500">
                    <th className="px-4 py-3 font-medium">Työlaji</th>
                    <th className="px-4 py-3 font-medium">Näytteitä</th>
                    <th className="px-4 py-3 font-medium">Kesk. laskuri</th>
                    <th className="px-4 py-3 font-medium">Kesk. tarjous</th>
                    <th className="px-4 py-3 font-medium">Kesk. poikkeama</th>
                    <th className="px-4 py-3 font-medium">Haarukka (p25–p75)</th>
                  </tr>
                </thead>
                <tbody>
                  {deviationStats.map((row) => (
                    <tr key={row.jobSlug} className="border-b border-stone-50">
                      <td className="px-4 py-3 font-medium">{row.jobSlug}</td>
                      <td className="px-4 py-3 tabular-nums">{row.sampleCount}</td>
                      <td className="px-4 py-3 tabular-nums">
                        {formatEuros(row.avgEstimateCents)}
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {formatEuros(row.avgBidCents)}
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {row.avgDeviationPercent > 0 ? "+" : ""}
                        {row.avgDeviationPercent} %
                      </td>
                      <td className="px-4 py-3 tabular-nums text-stone-600">
                        {row.p25DeviationPercent > 0 ? "+" : ""}
                        {row.p25DeviationPercent} % –{" "}
                        {row.p75DeviationPercent > 0 ? "+" : ""}
                        {row.p75DeviationPercent} %
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-stone-900">
            Oppivat hintahaarukat
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            Laskureiden dynaamiset kerroinhaitat valmiiden urakoiden ja
            tarjouspoikkeamien perusteella.
          </p>
          {learnedRanges.length === 0 ? (
            <p className="mt-4 rounded-xl border border-stone-200 bg-white p-6 text-sm text-stone-600">
              Ei vielä riittävästi dataa haarukoiden päivitykseen.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-xl border border-stone-200 bg-white">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-100 text-left text-xs uppercase tracking-wide text-stone-500">
                    <th className="px-4 py-3 font-medium">Laskuri</th>
                    <th className="px-4 py-3 font-medium">Näytteitä</th>
                    <th className="px-4 py-3 font-medium">Ala</th>
                    <th className="px-4 py-3 font-medium">Ylä</th>
                    <th className="px-4 py-3 font-medium">Mediaani</th>
                  </tr>
                </thead>
                <tbody>
                  {learnedRanges.map((row) => (
                    <tr
                      key={row.calculator_slug as string}
                      className="border-b border-stone-50"
                    >
                      <td className="px-4 py-3 font-medium">
                        {row.calculator_slug as string}
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {row.sample_count as number}
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {Number(row.low_multiplier).toFixed(2)}×
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {Number(row.high_multiplier).toFixed(2)}×
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {Number(row.median_deviation_percent) > 0 ? "+" : ""}
                        {Number(row.median_deviation_percent)} %
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
