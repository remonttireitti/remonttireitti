import Link from "next/link";
import { ElectricityPricePanel } from "@/components/electricity-price-panel";
import { HomeEnergySection } from "@/components/home-energy-section";
import { HomeFloorPlan } from "@/components/home-floor-plan";
import { HomeOverviewStats } from "@/components/home-overview-stats";
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
    <div className="mx-auto w-full max-w-[min(100%,96rem)] space-y-6">
      <HomeEnergySection />

      <ElectricityPricePanel initial={electricityPrices} className="mt-0" />

      <HomeFloorPlan hub={primaryHub} />

      <HomeOverviewStats hubCount={hubs.length} onlineCount={online} avgCo2={avgCo2} />

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
