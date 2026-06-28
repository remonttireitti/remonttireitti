import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { deleteHub } from "@/app/actions/hubs";
import { isHubOnline } from "@/lib/device-status";
import { fetchHub, formatLastSeen } from "@/lib/hubs";
import { getSessionSupabase, getSessionUser } from "@/lib/local-session";

function isOnline(lastSeen: string | null): boolean {
  return isHubOnline(lastSeen);
}

export default async function HubDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const supabase = await getSessionSupabase();

  const { id } = await params;
  const hub = await fetchHub(supabase, id, user.id);
  if (!hub) notFound();

  async function remove() {
    "use server";
    await deleteHub(id);
    redirect("/keskusyksikko");
  }

  const online = isOnline(hub.last_seen_at);

  return (
    <div className="mx-auto max-w-4xl">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/keskusyksikko"
            className="text-sm text-stone-600 hover:underline"
          >
            ← Keskusyksikkö
          </Link>
          <h1 className="mt-2 text-2xl font-bold">{hub.name}</h1>
          <p className="mt-1 text-sm text-stone-600">
            {online ? "Online" : formatLastSeen(hub.last_seen_at)}
            {hub.firmware_version && ` · Firmware ${hub.firmware_version}`}
          </p>
        </div>
        <form action={remove}>
          <button
            type="submit"
            className="rounded-xl border border-red-200 px-4 py-2 text-sm text-red-800"
          >
            Poista
          </button>
        </form>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold">Moduulit</h2>
          <ul className="mt-3 space-y-2">
            <li>
              <Link
                href="/ilmanvaihto"
                className="flex items-center justify-between rounded-xl border border-stone-200 px-4 py-3 hover:bg-stone-50"
              >
                <span>
                  <span className="font-medium">Ilmanvaihto</span>
                  <span className="mt-0.5 block text-xs text-stone-500">
                    CO₂, AirFi tuuletus
                    {hub.state.co2_ppm != null &&
                      ` · ${Math.round(hub.state.co2_ppm)} ppm`}
                  </span>
                </span>
                <span className="text-stone-400">→</span>
              </Link>
            </li>
            <li className="rounded-xl border border-dashed border-stone-200 px-4 py-3 text-sm text-stone-500">
              Lämmitys — tulossa
            </li>
            <li>
              <Link
                href="/koti/valot"
                className="flex items-center justify-between rounded-xl border border-stone-200 px-4 py-3 hover:bg-stone-50"
              >
                <span>
                  <span className="font-medium">Valaistus</span>
                  <span className="mt-0.5 block text-xs text-stone-500">
                    Zigbee-valot (SkyConnect)
                    {hub.state.lights &&
                      ` · ${Object.keys(hub.state.lights).length} valoa`}
                  </span>
                </span>
                <span className="text-stone-400">→</span>
              </Link>
            </li>
          </ul>
        </section>

        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold">ESP-NOW-laitteet</h2>
          <p className="mt-2 text-sm text-stone-600">
            Ei liitettyjä satelliitteja. Kun lisäät ESP-NOW-antureita, ne näkyvät tässä.
          </p>
        </section>
      </div>

      <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold">Firmware</h2>
        <p className="mt-2 text-sm text-stone-600">
          HA Yellow: aseta <code className="rounded bg-stone-100 px-1">ALYKOTI_DEVICE_TOKEN</code>{" "}
          tiedostoon{" "}
          <code className="rounded bg-stone-100 px-1">~/alykoti-yellow/.env</code> ja käynnistä{" "}
          <code className="rounded bg-stone-100 px-1">alykoti-yellow</code>-palvelu.
        </p>
      </section>
    </div>
  );
}
