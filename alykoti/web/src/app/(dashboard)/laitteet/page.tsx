import Link from "next/link";
import { countByProtocol } from "@/lib/device-protocol";
import { isHubOnline } from "@/lib/device-status";
import { normalizeHomeDevices } from "@/lib/device-normalize";
import { parseHubHomeDevices } from "@/lib/hub-lights";
import { fetchPrimaryHub } from "@/lib/hubs";
import { LAITTEET } from "@/lib/laitteet-paths";
import { getSessionSupabase, getSessionUser } from "@/lib/local-session";

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
    href: LAITTEET.zigbee,
  },
  {
    id: "zwave",
    title: "Z-Wave (Z-Pi 7)",
    description: "Valot, kytkimet, lukot Z-Wave JS UI:n kautta.",
    href: LAITTEET.zwave,
  },
  {
    id: "shelly",
    title: "Shelly",
    description: "Pro EM, Pro 4 ja muut — kanavat automaattisesti.",
    href: LAITTEET.shelly,
  },
  {
    id: "tasmota",
    title: "Tasmota (Sonoff)",
    description: "Muokatut Sonoff- ja Tasmota-WiFi-laitteet.",
    href: LAITTEET.tasmota,
  },
  {
    id: "airthings",
    title: "Airthings",
    description: "View Plus — CO₂, kosteus, lämpötila pilvestä.",
    href: LAITTEET.airthings,
  },
] as const;

export default async function LaitteetOverviewPage() {
  const user = await getSessionUser();
  const supabase = await getSessionSupabase();

  const hub = user ? await fetchPrimaryHub(supabase, user.id) : null;
  const hubOnline = hub ? isHubOnline(hub.last_seen_at) : false;

  const homeDevices = hub
    ? normalizeHomeDevices(hub.state?.home_devices, {
        integrations: hub.state?.integrations,
        airthingsState: hub.state,
      })
    : undefined;
  const parsed = parseHubHomeDevices(homeDevices, hub?.state?.lights, hub?.state?.device_overrides);
  const protocolCounts = countByProtocol(parsed);

  const deviceCount = parsed.length;

  return (
    <div className="mt-6 space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Yellow" value={hub ? (hubOnline ? "Online" : "Offline") : "—"} />
        <Stat label="Yhteensä" value={String(deviceCount)} />
        <Stat label="Zigbee" value={String(protocolCounts.zigbee)} />
        <Stat label="Z-Wave" value={String(protocolCounts.zwave)} />
      </section>
      <section className="grid gap-4 sm:grid-cols-3">
        <Stat label="Shelly" value={String(protocolCounts.shelly)} />
        <Stat label="Tasmota" value={String(protocolCounts.tasmota)} />
        <Stat label="Airthings" value={String(protocolCounts.airthings)} />
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
