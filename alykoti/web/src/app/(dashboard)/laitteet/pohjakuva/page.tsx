import { FloorPlanEditor } from "@/components/floor-plan-editor";
import { parseHubHomeDevices, prepareDevicesForList } from "@/lib/hub-lights";
import { normalizeHomeDevices } from "@/lib/device-normalize";
import type { FloorPlanDeviceSnapshot, FloorPlanPin } from "@/lib/floor-plan-pins";
import { fetchPrimaryHub } from "@/lib/hubs";
import type { HubState } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PohjakuvaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const hub = await fetchPrimaryHub(supabase, user.id);
  if (!hub) {
    return (
      <p className="text-sm text-stone-500">
        Keskusyksikköä ei löydy. Luo hub ensin integraatioista.
      </p>
    );
  }

  const state = (hub.state as HubState) ?? {};
  const pins = Array.isArray(state.floor_plan_pins) ? state.floor_plan_pins : [];

  const homeDevices = normalizeHomeDevices(state.home_devices, {
    integrations: state.integrations,
    airthingsState: state,
  });

  const devices: FloorPlanDeviceSnapshot[] = prepareDevicesForList(
    parseHubHomeDevices(homeDevices, state.lights, state.device_overrides),
    homeDevices,
    state.zwave_nodes,
    state.device_overrides,
  ).map((d) => ({
    id: d.id,
    name: d.name,
    on: d.on,
    controllable: d.controllable,
    readingLabel: d.readingLabel,
    temperature_c: d.temperature_c,
    humidity_pct: d.humidity_pct,
    co2_ppm: d.co2_ppm,
    sensor_state: d.sensor_state,
  }));

  return <FloorPlanEditor initialPins={pins as FloorPlanPin[]} devices={devices} />;
}
