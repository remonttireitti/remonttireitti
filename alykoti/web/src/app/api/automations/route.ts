import { NextResponse } from "next/server";
import { normalizeAutomationRules } from "@/lib/automation";
import {
  groupAutomationTargets,
  listAutomationTriggers,
} from "@/lib/automation-devices";
import { parseHubHomeDevices } from "@/lib/hub-lights";
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

  const homeDevices = normalizeHomeDevices(hub.state?.home_devices, {
    integrations: hub.state?.integrations,
    airthingsState: hub.state,
  });

  const devices = parseHubHomeDevices(homeDevices, hub.state?.lights, hub.state?.device_overrides);

  const triggers = listAutomationTriggers(devices);
  const targetGroups = groupAutomationTargets(devices);

  const config = parseHubConfig(hub.config);
  const legacyRules = normalizeAutomationRules(hub.state.automations);
  const rules = config.automations?.length ? config.automations : legacyRules;

  return NextResponse.json({
    configured: true,
    hubOnline: isHubOnline(hub.last_seen_at),
    rules,
    triggers,
    targets: targetGroups,
    /** @deprecated käytä triggers + targets */
    switches: triggers,
    lights: targetGroups.lights,
  });
}
