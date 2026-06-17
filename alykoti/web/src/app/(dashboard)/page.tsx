import Link from "next/link";
import { fetchHubs, formatLastSeen } from "@/lib/hubs";
import { isHubOnline } from "@/lib/device-status";
import { createClient } from "@/lib/supabase/server";

export default async function OverviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const hubs = user
    ? await fetchHubs(supabase, user.id).catch(() => [])
    : [];

  const online = hubs.filter((h) => isHubOnline(h.last_seen_at)).length;

  const co2Values = hubs
    .map((h) => h.state.co2_ppm)
    .filter((v): v is number => v != null);

  const avgCo2 =
    co2Values.length > 0
      ? Math.round(co2Values.reduce((a, b) => a + b, 0) / co2Values.length)
      : null;

  return (
    <div className="mx-auto max-w-4xl">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Koti</h1>
        <p className="mt-1 text-sm text-stone-600">Yleiskatsaus automaatioon.</p>
      </header>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Keskusyksiköt" value={String(hubs.length)} />
        <StatCard label="Online" value={String(online)} />
        <StatCard label="CO₂ keskiarvo" value={avgCo2 != null ? `${avgCo2} ppm` : "—"} />
      </div>

      {hubs.length === 0 && (
        <div className="mt-8 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-stone-600">
            Aloita lisäämällä keskusyksikkö.
          </p>
          <Link
            href="/keskusyksikko"
            className="mt-3 inline-block text-sm font-medium text-stone-800 hover:underline"
          >
            Keskusyksikkö →
          </Link>
        </div>
      )}

      <section className="mt-8 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold text-stone-900">Ilmanvaihto</h2>
          <Link
            href="/ilmanvaihto"
            className="text-sm font-medium text-stone-700 hover:underline"
          >
            Avaa →
          </Link>
        </div>

        {hubs.length === 0 ? (
          <p className="mt-3 text-sm text-stone-500">Ei dataa.</p>
        ) : (
          <ul className="mt-3 divide-y divide-stone-100">
            {hubs.slice(0, 3).map((h) => (
              <li key={h.id} className="py-3">
                <Link href="/ilmanvaihto" className="block hover:text-sky-800">
                  <span className="font-medium">{h.name}</span>
                  <span className="mt-1 block text-xs text-stone-500">
                    {formatLastSeen(h.last_seen_at)}
                    {h.state.co2_ppm != null && ` · CO₂ ${Math.round(h.state.co2_ppm)} ppm`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
