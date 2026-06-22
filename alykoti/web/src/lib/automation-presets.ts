import { newRuleId, type AutomationRule } from "@/lib/automation";
import { parseZwaveDeviceId } from "@/lib/device-protocol";
import type { HubLightDevice } from "@/lib/hub-lights";

function findDevice(
  devices: HubLightDevice[],
  id: string,
  nameIncludes: string,
): HubLightDevice | undefined {
  return (
    devices.find((d) => d.id === id) ??
    devices.find((d) => d.name.toLocaleLowerCase("fi").includes(nameIncludes.toLocaleLowerCase("fi")))
  );
}

function findZwaveByNode(
  devices: HubLightDevice[],
  nodeId: number,
  endpoint: number | undefined,
  nameIncludes: string,
): HubLightDevice | undefined {
  const epId = endpoint != null ? `zwave:${nodeId}:e${endpoint}` : undefined;
  const rootId = `zwave:${nodeId}`;
  if (epId) {
    const byEp = devices.find((d) => d.id === epId);
    if (byEp) return byEp;
  }
  const byRoot = devices.find((d) => d.id === rootId);
  if (byRoot) return byRoot;
  const parsed = devices.filter((d) => parseZwaveDeviceId(d.id)?.nodeId === nodeId);
  if (endpoint != null) {
    const epMatch = parsed.find((d) => d.endpoint === endpoint);
    if (epMatch) return epMatch;
  }
  return (
    parsed[0] ??
    findDevice(devices, rootId, nameIncludes)
  );
}

/** Eteisen valokytkin → sauna- ja suihkuvaloparit (Z-Wave node 52, kanavat 1/2). */
export function buildSaunaShowerMirrorPresets(
  devices: HubLightDevice[],
): { rules: AutomationRule[]; missing: string[] } {
  const missing: string[] = [];
  const switchDev = findZwaveByNode(devices, 52, undefined, "eteisen valokytkin");
  const switchEp1 = findZwaveByNode(devices, 52, 1, "eteisen valokytkin");
  const switchEp2 = findZwaveByNode(devices, 52, 2, "eteisen valokytkin");
  const saunaTakka = findZwaveByNode(devices, 82, undefined, "saunavalo takka");
  const saunaEteinen = findZwaveByNode(devices, 86, undefined, "saunavalo eteis");
  const suihkuTakka = findZwaveByNode(devices, 84, undefined, "suihkuvalo takka");
  const suihkuEteinen = findZwaveByNode(devices, 87, undefined, "suihkuvalo eteis");

  const triggerCh1 = switchEp1 ?? switchDev;
  const triggerCh2 = switchEp2 ?? switchDev;

  if (!triggerCh1) missing.push("Eteisen valokytkin (zwave:52, kanava 1)");
  if (!triggerCh2) missing.push("Eteisen valokytkin (zwave:52, kanava 2)");
  if (!saunaTakka) missing.push("Saunavalo takkahuoneessa");
  if (!saunaEteinen) missing.push("Saunavalo eteisessa");
  if (!suihkuTakka) missing.push("Suihkuvalo takkahuoneessa");
  if (!suihkuEteinen) missing.push("Suihkuvalo eteisessa");

  if (!triggerCh1 || !triggerCh2 || !saunaTakka || !saunaEteinen || !suihkuTakka || !suihkuEteinen) {
    return { rules: [], missing };
  }

  const ch1Endpoint = triggerCh1.endpoint ?? (triggerCh1.id === switchDev?.id ? 1 : undefined);
  const ch2Endpoint = triggerCh2.endpoint ?? (triggerCh2.id === switchDev?.id ? 2 : undefined);

  const rules: AutomationRule[] = [
    {
      id: newRuleId(),
      name: "Saunavalot — seuraa eteisen kytkintä (kanava 1)",
      enabled: true,
      trigger: {
        kind: "device",
        device_id: triggerCh1.id,
        mode: "switch_state",
        press: "short",
        endpoint: ch1Endpoint ?? null,
        button: null,
        action: null,
      },
      action: {
        type: "mirror",
        target_ids: [saunaTakka.id, saunaEteinen.id],
        brightness_pct: null,
      },
    },
    {
      id: newRuleId(),
      name: "Suihkuvalot — seuraa eteisen kytkintä (kanava 2)",
      enabled: true,
      trigger: {
        kind: "device",
        device_id: triggerCh2.id,
        mode: "switch_state",
        press: "short",
        endpoint: ch2Endpoint ?? null,
        button: null,
        action: null,
      },
      action: {
        type: "mirror",
        target_ids: [suihkuTakka.id, suihkuEteinen.id],
        brightness_pct: null,
      },
    },
  ];

  return { rules, missing };
}

export function mergeMirrorPresets(
  existing: AutomationRule[],
  presets: AutomationRule[],
): AutomationRule[] {
  const out = [...existing];
  for (const preset of presets) {
    const dup = existing.some(
      (r) =>
        r.trigger.kind === "device" &&
        preset.trigger.kind === "device" &&
        r.trigger.device_id === preset.trigger.device_id &&
        r.trigger.endpoint === preset.trigger.endpoint &&
        r.action.type === "mirror",
    );
    if (!dup) out.push(preset);
  }
  return out;
}
