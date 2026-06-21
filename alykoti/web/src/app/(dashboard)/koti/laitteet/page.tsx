import { DeviceManagementPanel } from "@/components/device-management-panel";
import { KotiSubNav } from "@/components/koti-sub-nav";

export default function LaitteetPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Koti — laitteet</h1>
        <p className="mt-1 text-sm text-stone-600">
          Paritus, nimet ja asetukset — Zigbee + Z-Wave Yellowin kautta.
        </p>
        <KotiSubNav />
      </header>
      <DeviceManagementPanel />
    </div>
  );
}
