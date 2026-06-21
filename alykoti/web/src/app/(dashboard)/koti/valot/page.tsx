import { KotiSubNav } from "@/components/koti-sub-nav";
import { LightingPanel } from "@/components/lighting-panel";

export default function ValotPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Koti</h1>
        <p className="mt-1 text-sm text-stone-600">
          Zigbee (SkyConnect) ja Z-Wave (Z-Pi 7) — synkataan Yellowilta.
        </p>
        <KotiSubNav />
      </header>

      <LightingPanel />
    </div>
  );
}
