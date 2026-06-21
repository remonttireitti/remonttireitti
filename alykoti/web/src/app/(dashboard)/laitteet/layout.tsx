import { LaitteetSubNav } from "@/components/laitteet-sub-nav";

export default function LaitteetLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-2">
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">Laitteet & integraatiot</h1>
        <p className="mt-1 text-sm text-stone-600">
          Yellow, Zigbee, Z-Wave, Shelly — paritus, nimet ja ohjaus.
        </p>
        <LaitteetSubNav />
      </header>
      {children}
    </div>
  );
}
