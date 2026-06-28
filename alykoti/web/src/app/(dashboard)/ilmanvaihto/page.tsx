import Link from "next/link";
import { redirect } from "next/navigation";
import { AirfiStatusPanel } from "@/components/airfi-status-panel";
import { VentilationDiagram } from "@/components/ventilation-diagram";
import { fetchPrimaryHub } from "@/lib/hubs";
import { LAITTEET } from "@/lib/laitteet-paths";
import { getSessionSupabase, getSessionUser } from "@/lib/local-session";

function isMissingSchemaError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; message?: string };
  return (
    e.code === "PGRST205" ||
    (typeof e.message === "string" &&
      e.message.includes("Could not find the table"))
  );
}

export default async function VentilationPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const supabase = await getSessionSupabase();

  let setupError: string | null = null;
  let hub = null;

  try {
    hub = await fetchPrimaryHub(supabase, user.id);
  } catch (error) {
    if (isMissingSchemaError(error)) {
      setupError =
        "Järjestelmää ei ole vielä alustettu. Katso asennusohje tiedostosta alykoti/SETUP.md.";
    } else {
      throw error;
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Ilmanvaihto</h1>
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

      {!hub && !setupError ? (
        <div className="mt-8 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-stone-600">
            Ilmanvaihto tarvitsee keskusyksikön. Lisää laite ensin.
          </p>
          <Link
            href={LAITTEET.keskusyksikko}
            className="mt-4 inline-block rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Lisää keskusyksikkö →
          </Link>
        </div>
      ) : hub ? (
        <div className="mt-6 space-y-4">
          <AirfiStatusPanel hub={hub} />
          <VentilationDiagram hub={hub} settingsHref="/ilmanvaihto/asetukset" />
        </div>
      ) : null}
    </div>
  );
}
