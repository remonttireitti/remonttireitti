import { NextResponse } from "next/server";
import {
  isThermostatActuatorDevice,
  isThermostatSensorDevice,
  normalizeHeatingPump,
  normalizeHeatingThermostats,
} from "@/lib/heating-thermostats";
import { parseHubHomeDevices, prepareDevicesForList } from "@/lib/hub-lights";
import { normalizeHomeDevices } from "@/lib/device-normalize";
import { fetchPrimaryHub, parseHubConfig } from "@/lib/hubs";
import { isHubOnline } from "@/lib/device-status";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const hub = await fetchPrimaryHub(supabase, user.id);
  if (!hub) {
    return NextResponse.json({ error: "no_hub" }, { status: 404 });
  }

  const homeDevices = normalizeHomeDevices(hub.state.home_devices, {
    integrations: hub.state.integrations,
    airthingsState: hub.state,
  });

  const devices = prepareDevicesForList(
    parseHubHomeDevices(homeDevices, hub.state.lights, hub.state.device_overrides),
    homeDevices,
    hub.state.zwave_nodes,
    hub.state.device_overrides,
    { groupZwaveEndpoints: false },
  );

  const config = parseHubConfig(hub.config);
  const thermostats = normalizeHeatingThermostats(config.heating_thermostats);
  const heatingPump = normalizeHeatingPump(config.heating_pump);

  return NextResponse.json({
    configured: true,
    hubOnline: isHubOnline(hub.last_seen_at),
    thermostats,
    heatingPump,
    sensors: devices.filter(isThermostatSensorDevice),
    actuators: devices.filter(isThermostatActuatorDevice),
    devices,
    heatingRuntime: hub.state.heating_runtime ?? {},
    heatingPumpRuntime: hub.state.heating_pump_runtime ?? null,
  });
}
