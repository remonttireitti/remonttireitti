import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AutomationSettingsForm } from "@/components/automation-settings-form";
import { DeviceOfflineAlert } from "@/components/device-offline-alert";
import { VentilationControls } from "@/components/ventilation-controls";
import { fetchPrimaryHub } from "@/lib/hubs";
import { createClient } from "@/lib/supabase/server";

export default async function VentilationSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const hub = await fetchPrimaryHub(supabase, user.id);
  if (!hub) notFound();

  return (
    <div className="mx-auto max-w-4xl">
      <header>
        <Link
          href="/ilmanvaihto"
          className="text-sm text-stone-600 hover:underline"
        >
          ← Ilmanvaihto
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Asetukset</h1>
      </header>

      <div className="mt-8 space-y-8">
        <DeviceOfflineAlert />
        <VentilationControls hub={hub} />
        <AutomationSettingsForm
          hubId={hub.id}
          config={hub.config}
          co2Ppm={hub.state.co2_ppm}
          pm25Ugm3={hub.state.pm25_ugm3}
          temperatureC={hub.state.temperature_c}
          outdoorTempC={hub.state.outdoor_temp_c}
        />
      </div>
    </div>
  );
}
