import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { deleteHub } from "@/app/actions/hubs";
import { isHubOnline } from "@/lib/device-status";
import { fetchHub, formatLastSeen } from "@/lib/hubs";
import { LAITTEET } from "@/lib/laitteet-paths";
import { createClient } from "@/lib/supabase/server";

function isOnline(lastSeen: string | null): boolean {
  return isHubOnline(lastSeen);
}

export default async function LaitteetHubDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const hub = await fetchHub(supabase, id, user.id);
  if (!hub) notFound();

  async function remove() {
    "use server";
    await deleteHub(id);
    redirect(LAITTEET.keskusyksikko);
  }

  const online = isOnline(hub.last_seen_at);
  const deviceCount = hub.state.home_devices ? Object.keys(hub.state.home_devices).length : 0;
  const lightCount = hub.state.lights ? Object.keys(hub.state.lights).length : 0;

  return (
    <div className="mt-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">{hub.name}</h2>
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
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Stat label="Laitteita" value={String(deviceCount)} />
        <Stat label="Valoja" value={String(lightCount)} />
      </div>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h3 className="font-semibold">Pikalinkit</h3>
        <ul className="mt-3 space-y-2">
          <li>
            <Link
              href={LAITTEET.luettelo}
              className="flex items-center justify-between rounded-xl border border-stone-200 px-4 py-3 hover:bg-stone-50"
            >
              <span className="font-medium">Laitteet & paritus</span>
              <span className="text-stone-400">→</span>
            </Link>
          </li>
          <li>
            <Link
              href={LAITTEET.valot}
              className="flex items-center justify-between rounded-xl border border-stone-200 px-4 py-3 hover:bg-stone-50"
            >
              <span className="font-medium">Valot</span>
              <span className="text-stone-400">→</span>
            </Link>
          </li>
          <li>
            <Link
              href={LAITTEET.shelly}
              className="flex items-center justify-between rounded-xl border border-stone-200 px-4 py-3 hover:bg-stone-50"
            >
              <span className="font-medium">Shelly</span>
              <span className="text-stone-400">→</span>
            </Link>
          </li>
          <li>
            <Link
              href="/ilmanvaihto"
              className="flex items-center justify-between rounded-xl border border-stone-200 px-4 py-3 hover:bg-stone-50"
            >
              <span>
                <span className="font-medium">Ilmanvaihto</span>
                {hub.state.co2_ppm != null && (
                  <span className="mt-0.5 block text-xs text-stone-500">
                    {Math.round(hub.state.co2_ppm)} ppm
                  </span>
                )}
              </span>
              <span className="text-stone-400">→</span>
            </Link>
          </li>
        </ul>
      </section>
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
