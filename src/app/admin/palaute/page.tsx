import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/admin-nav";
import { SiteHeader } from "@/components/site-header";
import { requireAdmin } from "@/lib/admin";
import { fetchPlatformFeedbackAdmin } from "@/lib/platform-feedback-server";
import { getSessionUser } from "@/lib/auth";
import { brand } from "@/lib/brand-theme";
import { createClient } from "@/lib/supabase/server";

const roleLabels = {
  customer: "Asiakas",
  contractor: "Urakoitsija",
} as const;

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleDateString("fi-FI", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function profileLabel(
  profile: { full_name: string | null } | null,
): string {
  if (!profile) return "—";
  return profile.full_name?.trim() || "—";
}

export default async function AdminFeedbackPage() {
  const user = await getSessionUser();
  if (!user) redirect("/kirjaudu?redirect=/admin/palaute");

  await requireAdmin();

  const supabase = await createClient();
  const rows = await fetchPlatformFeedbackAdmin(supabase);

  const avgClarity =
    rows.length > 0
      ? rows.reduce((s, r) => s + r.clarity_rating, 0) / rows.length
      : null;
  const avgExperience =
    rows.length > 0
      ? rows.reduce((s, r) => s + r.experience_rating, 0) / rows.length
      : null;
  const recommendPct =
    rows.length > 0
      ? Math.round(
          (rows.filter((r) => r.would_recommend).length / rows.length) * 100,
        )
      : null;

  return (
    <div className={brand.page}>
      <SiteHeader />
      <main className={brand.mainWide}>
        <Link href="/oma-tili" className="text-sm text-sky-700 hover:underline">
          ← Oma tili
        </Link>
        <h1 className="mt-4 text-2xl font-bold">Palaute — käyttökokemus</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600">
          Asiakkaiden ja urakoitsijoiden palaute palvelun selkeydestä ja
          käyttömukavuudesta. Erillinen urakoitsijan tähtiarvosteluista.
        </p>
        <AdminNav current="/admin/palaute" />

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Palautteita yhteensä"
            value={String(rows.length)}
          />
          <StatCard
            label="Keskiarvo: selkeys"
            value={avgClarity != null ? avgClarity.toFixed(1) : "—"}
          />
          <StatCard
            label="Keskiarvo: kokemus"
            value={avgExperience != null ? avgExperience.toFixed(1) : "—"}
          />
        </div>
        {recommendPct != null && (
          <p className="mt-3 text-sm text-stone-600">
            Suosittelisi palvelua:{" "}
            <span className="font-semibold text-stone-900">{recommendPct}%</span>
          </p>
        )}

        <div className="mt-8 overflow-x-auto rounded-xl border border-stone-200 bg-white">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-left text-xs font-semibold uppercase tracking-wide text-stone-600">
                <th className="px-4 py-3">Aika</th>
                <th className="px-4 py-3">Rooli</th>
                <th className="px-4 py-3">Käyttäjä</th>
                <th className="px-4 py-3">Selkeys</th>
                <th className="px-4 py-3">Kokemus</th>
                <th className="px-4 py-3">Suositus</th>
                <th className="px-4 py-3">Kommentti</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-stone-500"
                  >
                    Ei vielä palautteita.
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const projectTitle = row.projects
                    ? Array.isArray(row.projects)
                      ? row.projects[0]?.title
                      : row.projects.title
                    : null;
                  const profile = row.profiles
                    ? Array.isArray(row.profiles)
                      ? row.profiles[0]
                      : row.profiles
                    : null;

                  return (
                    <tr
                      key={row.id}
                      className="border-b border-stone-100 align-top last:border-0"
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-stone-600">
                        {formatWhen(row.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        {roleLabels[row.role]}
                        {projectTitle && (
                          <p className="mt-0.5 text-xs text-stone-500">
                            {projectTitle}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-stone-800">
                        {profileLabel(profile)}
                      </td>
                      <td className="px-4 py-3">{row.clarity_rating}/5</td>
                      <td className="px-4 py-3">{row.experience_rating}/5</td>
                      <td className="px-4 py-3">
                        {row.would_recommend ? "Kyllä" : "En"}
                      </td>
                      <td className="max-w-xs px-4 py-3 text-stone-700">
                        {row.suggestions ? (
                          <span className="whitespace-pre-wrap">
                            {row.suggestions}
                          </span>
                        ) : (
                          <span className="text-stone-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-stone-900">{value}</p>
    </div>
  );
}
