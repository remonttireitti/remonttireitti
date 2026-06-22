import { newRuleId, type AutomationRule } from "@/lib/automation";
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

/** Eteisen valokytkin → sauna- ja suihkuvaloparit (Z-Wave node 52, kanavat 1/2). */
export function buildSaunaShowerMirrorPresets(
  devices: HubLightDevice[],
): { rules: AutomationRule[]; missing: string[] } {
  const missing: string[] = [];
  const switchDev = findDevice(devices, "zwave:52", "eteisen valokytkin");
  const saunaTakka = findDevice(devices, "zwave:82", "saunavalo takka");
  const saunaEteinen = findDevice(devices, "zwave:86", "saunavalo eteis");
  const suihkuTakka = findDevice(devices, "zwave:84", "suihkuvalo takka");
  const suihkuEteinen = findDevice(devices, "zwave:87", "suihkuvalo eteis");

  if (!switchDev) missing.push("Eteisen valokytkin (zwave:52)");
  if (!saunaTakka) missing.push("Saunavalo takkahuoneessa");
  if (!saunaEteinen) missing.push("Saunavalo eteisessa");
  if (!suihkuTakka) missing.push("Suihkuvalo takkahuoneessa");
  if (!suihkuEteinen) missing.push("Suihkuvalo eteisessa");

  if (!switchDev || !saunaTakka || !saunaEteinen || !suihkuTakka || !suihkuEteinen) {
    return { rules: [], missing };
  }

  const rules: AutomationRule[] = [
    {
      id: newRuleId(),
      name: "Saunavalot — seuraa eteisen kytkintä (kanava 1)",
      enabled: true,
      trigger: {
        kind: "device",
        device_id: switchDev.id,
        mode: "switch_state",
        press: "short",
        endpoint: 1,
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
        device_id: switchDev.id,
        mode: "switch_state",
        press: "short",
        endpoint: 2,
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
