import { canWrite, hasCapability } from "@/lib/capabilities";
import { kindLabel, type HubLightDevice } from "@/lib/hub-lights";

export type AutomationDeviceOption = {
  id: string;
  name: string;
  protocol: string;
  kind: string;
  kindLabel: string;
  controllable: boolean;
  capabilitiesLabel: string;
};

export type AutomationTargetGroups = {
  lights: AutomationDeviceOption[];
  switches: AutomationDeviceOption[];
  locks: AutomationDeviceOption[];
  other: AutomationDeviceOption[];
};

function toOption(device: HubLightDevice): AutomationDeviceOption {
  return {
    id: device.id,
    name: device.name,
    protocol: device.protocol,
    kind: device.kind,
    kindLabel: kindLabel(device.kind),
    controllable: device.controllable,
    capabilitiesLabel: device.capabilitiesLabel,
  };
}

/** Laukaisin: painike, kaukosäädin tai anturi joka voi laukaista tapahtuman. */
export function isAutomationTrigger(device: HubLightDevice): boolean {
  const caps = device.capabilities;
  if (hasCapability(caps, "button")) return true;
  if (device.kind === "switch" && !device.controllable) return true;
  if (
    hasCapability(caps, "contact") ||
    hasCapability(caps, "motion") ||
    hasCapability(caps, "occupancy")
  ) {
    return true;
  }
  return false;
}

/** Kohde: ohjattava valo, kytkin, rele, lukko, tuuletin jne. */
export function isAutomationTarget(device: HubLightDevice): boolean {
  if (!device.controllable) return false;
  const caps = device.capabilities;
  return (
    canWrite(caps, "switch") ||
    canWrite(caps, "dimmer") ||
    canWrite(caps, "relay") ||
    canWrite(caps, "lock") ||
    canWrite(caps, "fan") ||
    canWrite(caps, "cover")
  );
}

function targetBucket(device: HubLightDevice): keyof AutomationTargetGroups {
  const caps = device.capabilities;
  if (hasCapability(caps, "lock") || device.kind === "lock") return "locks";
  if (hasCapability(caps, "dimmer") || hasCapability(caps, "color")) return "lights";
  if (hasCapability(caps, "switch") || hasCapability(caps, "relay") || device.kind === "switch") {
    return "switches";
  }
  if (device.kind === "light") return "lights";
  if (device.kind === "fan") return "other";
  return "other";
}

export function groupAutomationTargets(devices: HubLightDevice[]): AutomationTargetGroups {
  const groups: AutomationTargetGroups = {
    lights: [],
    switches: [],
    locks: [],
    other: [],
  };

  for (const device of devices) {
    if (!isAutomationTarget(device)) continue;
    groups[targetBucket(device)].push(toOption(device));
  }

  for (const key of Object.keys(groups) as (keyof AutomationTargetGroups)[]) {
    groups[key].sort((a, b) => a.name.localeCompare(b.name, "fi"));
  }

  return groups;
}

export function listAutomationTriggers(devices: HubLightDevice[]): AutomationDeviceOption[] {
  return devices
    .filter(isAutomationTrigger)
    .map(toOption)
    .sort((a, b) => a.name.localeCompare(b.name, "fi"));
}

export function protocolLabel(protocol: string): string {
  switch (protocol) {
    case "zigbee":
      return "Zigbee";
    case "zwave":
      return "Z-Wave";
    case "shelly":
      return "Shelly";
    case "tasmota":
      return "Tasmota";
    case "airthings":
      return "Airthings";
    default:
      return protocol;
  }
}
