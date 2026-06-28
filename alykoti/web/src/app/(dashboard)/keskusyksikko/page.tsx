import Link from "next/link";
import { RegisterHubForm } from "@/components/register-hub-form";
import { isHubOnline } from "@/lib/device-status";
import { fetchHubs, formatLastSeen } from "@/lib/hubs";
import { getSessionSupabase, getSessionUser } from "@/lib/local-session";
import type { Hub } from "@/lib/types";

function isMissingSchemaError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; message?: string };
  return (
    e.code === "PGRST205" ||
    (typeof e.message === "string" &&
      e.message.includes("Could not find the table"))
  );
}

function isOnline(hub: Hub): boolean {
  return isHubOnline(hub.last_seen_at);
}

export default async function HubListPage() {
  const user = await getSessionUser();
  const supabase = await getSessionSupabase();

  let hubs: Hub[] = [];
  let setupError: string | null = null;

  if (user) {
    try {
      hubs = await fetchHubs(supabase, user.id);
    } catch (error) {
      if (isMissingSchemaError(error)) {
        setupError =
          "Järjestelmää ei ole vielä alustettu. Katso asennusohje tiedostosta alykoti/SETUP.md.";
      } else {
        throw error;
      }
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Keskusyksikkö</h1>
        <p className="mt-1 text-sm text-stone-600">
          Guition ESP32-P4 — automaation keskus. ESP-NOW-laitteet liitetään tähän.
        </p>
      </header>

      {setupError && (
        <div
          className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"
          role="alert"
        >
          <p className="font-semibold">Käyttöönotto kesken</p>
          <p className="mt-1">{setupError}</p>
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <RegisterHubForm disabled={!!setupError} />
        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold">Laitteet</h2>
          {hubs.length === 0 ? (
            <p className="mt-3 text-sm text-stone-500">Ei keskusyksiköitä.</p>
          ) : (
            <ul className="mt-3 divide-y divide-stone-100">
              {hubs.map((hub) => (
                <li key={hub.id} className="py-3">
                  <Link
                    href={`/keskusyksikko/${hub.id}`}
                    className="block hover:text-sky-800"
                  >
                    <span className="font-medium">{hub.name}</span>
                    <span className="mt-1 block text-xs text-stone-500">
                      {isOnline(hub) ? "Online" : formatLastSeen(hub.last_seen_at)}
                      {hub.firmware_version && ` · v${hub.firmware_version}`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="mt-8 rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-5">
        <h2 className="font-semibold text-stone-800">ESP-NOW-satelliitit</h2>
        <p className="mt-2 text-sm text-stone-600">
          Tuleva ominaisuus: anturit ja releet ilman omaa WiFi-yhteyttä. Keskusyksikkö
          kerää datan ja välittää komennot.
        </p>
      </section>
    </div>
  );
}
