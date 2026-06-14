import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/admin-nav";
import { SiteHeader } from "@/components/site-header";
import { requireAdmin } from "@/lib/admin";
import { fetchJobDemandSignals } from "@/lib/admin-demand-server";
import { getSessionUser } from "@/lib/auth";

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleDateString("fi-FI", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function AdminDemandPage() {
  const user = await getSessionUser();
  if (!user) redirect("/kirjaudu?redirect=/admin/kysynta");

  await requireAdmin();

  const signals = await fetchJobDemandSignals(100);
  const totalRequests = signals.reduce((sum, s) => sum + s.project_count, 0);

  return (
    <div className="min-h-full bg-stone-50 text-stone-900">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-6 py-12">
        <Link href="/oma-tili" className="text-sm text-sky-700 hover:underline">
          ← Oma tili
        </Link>
        <h1 className="mt-4 text-2xl font-bold">Kysyntä — vapaat pyynnöt</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600">
          Asiakkaat voivat valita &quot;En löydä listalta&quot; ja kuvailla työn
          omin sanoin. Julkaistut pyynnöt kerryttävät tilastoa — kun sama aihe
          toistuu, lisää se varsinaiseen valikoimaan migraatiolla.
        </p>
        <AdminNav current="/admin/kysynta" />

        <div className="mt-8 rounded-xl border border-stone-200 bg-white p-4 text-sm text-stone-700">
          <p>
            <span className="font-semibold text-stone-900">
              {signals.length}
            </span>{" "}
            eri aihetta ·{" "}
            <span className="font-semibold text-stone-900">
              {totalRequests}
            </span>{" "}
            julkaistua vapaamuotoista pyyntöä yhteensä
          </p>
        </div>

        <div className="mt-6 overflow-x-auto rounded-xl border border-stone-200 bg-white">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-left text-xs font-semibold uppercase tracking-wide text-stone-600">
                <th className="px-4 py-3">Asiakkaan kuvaus</th>
                <th className="px-4 py-3">Pyyntöjä</th>
                <th className="px-4 py-3">Ensimmäinen</th>
                <th className="px-4 py-3">Viimeisin</th>
              </tr>
            </thead>
            <tbody>
              {signals.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-stone-500"
                  >
                    Ei vielä dataa. Kun asiakkaat käyttävät vapaata pyyntöä,
                    rivit ilmestyvät tänne.
                  </td>
                </tr>
              ) : (
                signals.map((row) => (
                  <tr
                    key={row.normalized_key}
                    className="border-b border-stone-100 last:border-0"
                  >
                    <td className="px-4 py-3 font-medium text-stone-900">
                      {row.sample_label}
                      <span className="mt-0.5 block text-xs font-normal text-stone-400">
                        {row.normalized_key}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex min-w-[2rem] justify-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                          row.project_count >= 5
                            ? "bg-emerald-100 text-emerald-900"
                            : row.project_count >= 3
                              ? "bg-amber-100 text-amber-900"
                              : "bg-stone-100 text-stone-700"
                        }`}
                      >
                        {row.project_count}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {formatWhen(row.first_seen_at)}
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {formatWhen(row.last_seen_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-6 text-xs text-stone-500">
          Vihje: vihreällä korostetut (≥5 pyyntöä) ovat hyviä ehdokkaita uudeksi
          valikoiman tyypiksi. Lisää{" "}
          <code className="rounded bg-stone-100 px-1">job_types</code>-rivi
          migraatiossa ja poista tarpeettomuus vapaasta polusta.
        </p>
      </main>
    </div>
  );
}
