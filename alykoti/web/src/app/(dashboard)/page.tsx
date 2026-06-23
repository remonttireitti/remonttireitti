import Link from "next/link";
import { ElectricityPricePanel } from "@/components/electricity-price-panel";
import { HomeFloorPlan } from "@/components/home-floor-plan";
import { fetchElectricityPrices } from "@/lib/electricity-prices";
import { fetchHubs } from "@/lib/hubs";
import { isHubOnline } from "@/lib/device-status";
import { LAITTEET } from "@/lib/laitteet-paths";
import { createClient } from "@/lib/supabase/server";

export default async function OverviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [hubs, electricityPrices] = await Promise.all([
    user ? fetchHubs(supabase, user.id).catch(() => []) : Promise.resolve([]),
    fetchElectricityPrices().catch(() => null),
  ]);

  const online = hubs.filter((h) => isHubOnline(h.last_seen_at)).length;

  const co2Values = hubs
    .map((h) => h.state.co2_ppm)
    .filter((v): v is number => v != null);

  const avgCo2 =
    co2Values.length > 0
      ? Math.round(co2Values.reduce((a, b) => a + b, 0) / co2Values.length)
      : null;

  const primaryHub = hubs[0] ?? null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <ElectricityPricePanel initial={electricityPrices} className="mt-0" />

      <HomeFloorPlan hub={primaryHub} />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Keskusyksiköt" value={String(hubs.length)} />
        <StatCard label="Online" value={String(online)} />
        <StatCard label="CO₂ keskiarvo" value={avgCo2 != null ? `${avgCo2} ppm` : "—"} />
      </div>

      {hubs.length === 0 && (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-stone-600">Aloita lisäämällä keskusyksikkö asetuksista.</p>
          <Link
            href={LAITTEET.keskusyksikko}
            className="mt-3 inline-block text-sm font-medium text-stone-800 hover:underline"
          >
            Keskusyksikkö →
          </Link>
        </div>
      )}
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
