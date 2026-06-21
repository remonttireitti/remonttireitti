import Link from "next/link";
import { RegisterHubForm } from "@/components/register-hub-form";
import { isHubOnline } from "@/lib/device-status";
import { fetchHubs, formatLastSeen } from "@/lib/hubs";
import { LAITTEET } from "@/lib/laitteet-paths";
import { createClient } from "@/lib/supabase/server";
import type { Hub } from "@/lib/types";

function isMissingSchemaError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; message?: string };
  return (
    e.code === "PGRST205" ||
    (typeof e.message === "string" && e.message.includes("Could not find the table"))
  );
}

function isOnline(hub: Hub): boolean {
  return isHubOnline(hub.last_seen_at);
}

export default async function LaitteetKeskusyksikkoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
    <div className="mt-6 space-y-6">
      {setupError && (
        <div
          className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"
          role="alert"
        >
          <p className="font-semibold">Käyttöönotto kesken</p>
          <p className="mt-1">{setupError}</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <RegisterHubForm disabled={!!setupError} />
        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold">Rekisteröidyt laitteet</h2>
          <p className="mt-1 text-sm text-stone-600">
            HA Yellow (Raspberry Pi) — Zigbee, Z-Wave ja Shelly synkataan webiin.
          </p>
          {hubs.length === 0 ? (
            <p className="mt-3 text-sm text-stone-500">Ei keskusyksiköitä.</p>
          ) : (
            <ul className="mt-3 divide-y divide-stone-100">
              {hubs.map((hub) => (
                <li key={hub.id} className="py-3">
                  <Link
                    href={`${LAITTEET.keskusyksikko}/${hub.id}`}
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

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold">Yellow-asennus</h2>
        <p className="mt-2 text-sm text-stone-600">
          Kopioi rekisteröinnin jälkeen saatu token tiedostoon{" "}
          <code className="rounded bg-stone-100 px-1">~/alykoti-yellow/.env</code> ja käynnistä{" "}
          <code className="rounded bg-stone-100 px-1">alykoti-yellow</code>-palvelu Pi:llä.
        </p>
      </section>
    </div>
  );
}
