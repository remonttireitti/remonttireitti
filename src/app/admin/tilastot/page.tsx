import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/admin-nav";
import { SiteHeader } from "@/components/site-header";
import { requireAdmin } from "@/lib/admin";
import { fetchAdminSiteStats } from "@/lib/admin-stats-server";
import { getSessionUser } from "@/lib/auth";
import { brand } from "@/lib/brand-theme";
import { siteConfig } from "@/lib/site-config";

function formatDateFi(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("fi-FI", {
    day: "numeric",
    month: "short",
  });
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
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

export default async function AdminStatsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/kirjaudu?redirect=/admin/tilastot");

  await requireAdmin();

  const stats = await fetchAdminSiteStats();
  const maxDailyViews = Math.max(...stats.traffic.daily.map((d) => d.views), 1);

  return (
    <div className={brand.page}>
      <SiteHeader />
      <main className={brand.mainWide}>
        <Link href="/oma-tili" className="text-sm text-sky-700 hover:underline">
          ← Oma tili
        </Link>
        <h1 className="mt-4 text-2xl font-bold">Tilastot</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600">
          Anonyymi kävijätilasto (uniikit kävijät, sivulataukset) kerätään kaikilta
          sivuilta ilman rekisteröitymistä. Rekisteröitymiset ja urakkatoiminta
          tulevat suoraan tietokannasta.
        </p>
        <AdminNav current="/admin/tilastot" />

        <section className="mt-8">
          <h2 className="text-lg font-semibold text-stone-900">Kävijät</h2>
          {!stats.traffic.hasData ? (
            <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              Ei vielä kävijädataa. Kun käyttäjät vierailevat sivustolla, lataukset
              näkyvät täällä automaattisesti (ei rekisteröitymistä eikä
              evästehyväksyntää vaadita).
              {siteConfig.gaId && (
                <>
                  {" "}
                  Google Analytics on myös käytössä ulkoisessa raportissa (
                  {siteConfig.gaId}).
                </>
              )}
            </p>
          ) : null}

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Sivulataukset tänään" value={String(stats.traffic.viewsToday)} />
            <StatCard
              label="Sivulataukset (7 pv)"
              value={String(stats.traffic.views7d)}
              hint={`${stats.traffic.visitors7d} uniikkia kävijää`}
            />
            <StatCard
              label="Sivulataukset (30 pv)"
              value={String(stats.traffic.views30d)}
              hint={`${stats.traffic.visitors30d} uniikkia kävijää`}
            />
            <StatCard
              label="Kirjautuneet lataukset (30 pv)"
              value={String(stats.traffic.loggedInViews30d)}
            />
          </div>

          <div className="mt-6 rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-stone-900">
              Sivulataukset viimeiset 30 päivää
            </h3>
            <div className="mt-4 flex items-end gap-0.5 overflow-x-auto pb-1" aria-hidden>
              {stats.traffic.daily.map((day) => (
                <div
                  key={day.date}
                  className="flex min-w-[10px] flex-1 flex-col items-center gap-1"
                  title={`${formatDateFi(day.date)}: ${day.views} latausta, ${day.visitors} kävijää`}
                >
                  <div
                    className="w-full min-w-[8px] rounded-t bg-sky-600"
                    style={{
                      height: `${Math.max(4, (day.views / maxDailyViews) * 96)}px`,
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-xs text-stone-500">
              <span>{formatDateFi(stats.traffic.daily[0]?.date ?? "")}</span>
              <span>
                {formatDateFi(stats.traffic.daily[stats.traffic.daily.length - 1]?.date ?? "")}
              </span>
            </div>
          </div>

          {stats.traffic.topPaths.length > 0 && (
            <div className="mt-6 overflow-x-auto rounded-xl border border-stone-200 bg-white">
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50 text-left text-xs font-semibold uppercase tracking-wide text-stone-600">
                    <th className="px-4 py-3">Sivu</th>
                    <th className="px-4 py-3">Lataukset (30 pv)</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.traffic.topPaths.map((row) => (
                    <tr
                      key={row.path}
                      className="border-b border-stone-100 last:border-0"
                    >
                      <td className="px-4 py-3 font-mono text-stone-900">{row.path}</td>
                      <td className="px-4 py-3 text-stone-700">{row.views}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-stone-900">Käyttäjät</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              label="Asiakkaat yhteensä"
              value={String(stats.users.totalCustomers)}
              hint={`+${stats.users.newCustomers7d} viikossa · +${stats.users.newCustomers30d} kk`}
            />
            <StatCard
              label="Urakoitsijat yhteensä"
              value={String(stats.users.totalContractors)}
              hint={`+${stats.users.newContractors7d} viikossa · +${stats.users.newContractors30d} kk`}
            />
            <StatCard
              label="Rekisteröityneet (30 pv)"
              value={String(
                stats.users.newCustomers30d + stats.users.newContractors30d,
              )}
            />
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-stone-900">Urakat ja tarjoukset</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard label="Avoimet pyynnöt" value={String(stats.activity.projectsOpen)} />
            <StatCard
              label="Valmistuneet urakat"
              value={String(stats.activity.projectsCompleted)}
            />
            <StatCard
              label="Uudet pyynnöt (30 pv)"
              value={String(stats.activity.projectsCreated30d)}
              hint={`${stats.activity.projectsCreated7d} viime viikolla`}
            />
            <StatCard
              label="Tarjoukset (30 pv)"
              value={String(stats.activity.bidsSubmitted30d)}
              hint={`${stats.activity.bidsSubmitted7d} viime viikolla`}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
