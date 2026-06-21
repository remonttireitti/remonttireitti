import Link from "next/link";
import { fetchPrimaryHub } from "@/lib/hubs";
import { isHubOnline } from "@/lib/device-status";
import { LAITTEET } from "@/lib/laitteet-paths";
import { createClient } from "@/lib/supabase/server";

const INTEGRATIONS = [
  {
    id: "yellow",
    title: "Keskusyksikkö (Yellow)",
    description: "Raspberry Pi — Zigbee, Z-Wave, synkki webiin.",
    href: LAITTEET.keskusyksikko,
  },
  {
    id: "zigbee",
    title: "Zigbee (SkyConnect)",
    description: "Lamput ja anturit Zigbee2MQTT:n kautta.",
    href: LAITTEET.luettelo,
  },
  {
    id: "zwave",
    title: "Z-Wave (Z-Pi 7)",
    description: "Valot, kytkimet, lukot Z-Wave JS UI:n kautta.",
    href: LAITTEET.luettelo,
  },
  {
    id: "shelly",
    title: "Shelly",
    description: "WiFi-releet ja dimmerit paikallisverkossa.",
    href: LAITTEET.shelly,
  },
] as const;

export default async function LaitteetOverviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const hub = user ? await fetchPrimaryHub(supabase, user.id) : null;
  const hubOnline = hub ? isHubOnline(hub.last_seen_at) : false;
  const deviceCount = hub?.state.home_devices
    ? Object.keys(hub.state.home_devices).length
    : 0;
  const shellyCount = hub?.state.integrations?.shelly?.devices?.length ?? 0;

  return (
    <div className="mt-6 space-y-6">
      <section className="grid gap-4 sm:grid-cols-3">
        <Stat label="Yellow" value={hub ? (hubOnline ? "Online" : "Offline") : "—"} />
        <Stat label="Laitteita" value={String(deviceCount)} />
        <Stat label="Shelly" value={String(shellyCount)} />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {INTEGRATIONS.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:border-stone-300 hover:shadow"
          >
            <h2 className="font-semibold text-stone-900">{item.title}</h2>
            <p className="mt-2 text-sm text-stone-600">{item.description}</p>
            <p className="mt-3 text-sm font-medium text-stone-800">Avaa →</p>
          </Link>
        ))}
      </section>

      {!hub && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          Aloita{" "}
          <Link href={LAITTEET.keskusyksikko} className="font-semibold underline">
            rekisteröimällä keskusyksikkö
          </Link>
          .
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}
