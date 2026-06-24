import { EnergyPanel } from "@/components/energy-panel";

export default function EnergiaPage() {
  return (
    <div className="mx-auto w-full max-w-[min(100%,96rem)]">
      <div className="mb-2">
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">Energia</h1>
        <p className="mt-1 text-sm text-stone-600">
          Kokonaiskulutus, trendit, tilastot ja yksittäiset energiamittarit.
        </p>
      </div>
      <EnergyPanel variant="page" className="mt-4" />
    </div>
  );
}
