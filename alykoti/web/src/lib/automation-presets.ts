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

function switchMirrorRule(
  name: string,
  triggerId: string,
  endpoint: number,
  targetId: string,
): AutomationRule {
  return {
    id: newRuleId(),
    name,
    enabled: true,
    trigger: {
      kind: "device",
      device_id: triggerId,
      mode: "switch_state",
      press: "short",
      endpoint,
      button: null,
      action: null,
    },
    action: {
      type: "mirror",
      target_ids: [targetId],
      brightness_pct: null,
    },
  };
}

/** Tunnetut sauna/suihku-kytkinparit: vain eteinen → takkahuone (ei paluusilmukkaa). */
const SAUNA_SHOWER_SWITCH_PAIRS = [
  {
    name: "Sauna — eteinen → takkahuone",
    eteinenNode: 52,
    eteinenEp: 1,
    takkaNode: 82,
    takkaEp: 1,
    eteinenHint: "eteisen valokytkin",
    takkaHint: "saunavalo takka",
  },
  {
    name: "Suihku — eteinen → takkahuone",
    eteinenNode: 52,
    eteinenEp: 2,
    takkaNode: 84,
    takkaEp: 2,
    eteinenHint: "eteisen valokytkin",
    takkaHint: "suihkuvalo takka",
  },
] as const;

function isSaunaShowerMirrorRule(rule: AutomationRule): boolean {
  if (rule.action.type !== "mirror") return false;
  const n = rule.name.toLocaleLowerCase("fi");
  if (n.includes("sauna") || n.includes("suihku")) return true;
  if (rule.trigger.kind !== "device") return false;
  return /^zwave:(52|82|84|86|87)/.test(rule.trigger.device_id);
}

/** Poista takkahuone→eteinen paluusäännöt (aiheuttivat silmukan). */
function stripReverseSaunaShowerRules(rules: AutomationRule[]): AutomationRule[] {
  return rules.filter((r) => {
    if (!isSaunaShowerMirrorRule(r)) return true;
    if (r.trigger.kind !== "device") return true;
    const tid = r.trigger.device_id;
    return tid.startsWith("zwave:52:");
  });
}

/**
 * Eteisen ja takkahuoneen kytkimet peilaavat toisiaan (sama huone, kaksi kytkintä / valo).
 * Kanava 1 = sauna, kanava 2 = suihku. Fibaro: sauna OUT1 (e1), suihku OUT2 (e2).
 */
export function buildSaunaShowerMirrorPresets(
  devices: HubLightDevice[],
): { rules: AutomationRule[]; missing: string[] } {
  const missing: string[] = [];
  const rules: AutomationRule[] = [];

  for (const pair of SAUNA_SHOWER_SWITCH_PAIRS) {
    const eteinen = findZwaveByNode(devices, pair.eteinenNode, pair.eteinenEp, pair.eteinenHint);
    const takka = findZwaveByNode(devices, pair.takkaNode, pair.takkaEp, pair.takkaHint);
    if (!eteinen) {
      missing.push(`Eteisen kytkin (zwave:${pair.eteinenNode}:e${pair.eteinenEp})`);
    }
    if (!takka) {
      missing.push(`Takkahuoneen kytkin (zwave:${pair.takkaNode}:e${pair.takkaEp})`);
    }
    if (!eteinen || !takka) continue;

    const eteEp = eteinen.endpoint ?? pair.eteinenEp;
    const takkaEp = takka.endpoint ?? pair.takkaEp;

    rules.push(switchMirrorRule(pair.name, eteinen.id, eteEp, takka.id));
  }

  return { rules, missing };
}

/** Korjaa vanhat (monikohde-)säännöt nykyiseen kytkinpari-malliin. */
export function repairSaunaShowerMirrorRules(rules: AutomationRule[]): AutomationRule[] {
  const kept = stripReverseSaunaShowerRules(rules.filter((r) => !isSaunaShowerMirrorRule(r)));
  const hardcoded: AutomationRule[] = [];
  for (const pair of SAUNA_SHOWER_SWITCH_PAIRS) {
    const eteId = `zwave:${pair.eteinenNode}:e${pair.eteinenEp}`;
    const takkaId = `zwave:${pair.takkaNode}:e${pair.takkaEp}`;
    hardcoded.push(switchMirrorRule(pair.name, eteId, pair.eteinenEp, takkaId));
  }
  return [...kept, ...hardcoded];
}

export function mergeMirrorPresets(
  existing: AutomationRule[],
  presets: AutomationRule[],
): AutomationRule[] {
  const kept = stripReverseSaunaShowerRules(
    existing.filter((r) => !isSaunaShowerMirrorRule(r)),
  );
  return [...kept, ...presets];
}
